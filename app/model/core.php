<?php

/**
 * @author		Kevin Schulz <paranerd.development@gmail.com>
 * @copyright	(c) 2017, Kevin Schulz. All Rights Reserved
 * @license		Affero General Public License <http://www.gnu.org/licenses/agpl>
 * @link		https://simpledrive.org
 */

require_once 'app/model/twofactor.php';

class Core_Model {
	public function __construct() {
		$this->db			= null;
	}

	/**
	 * Initiate database setup, create docs- and user-folder, write config, update htaccess and create user
	 * @param user
	 * @param pass
	 * @param mail
	 * @param mail_pass
	 * @param db_server
	 * @param db_name
	 * @param db_user
	 * @param db_pass
	 * @param datadir
	 * @return string authorization token
	 */

	public function setup($username, $pass, $mail, $mail_pass, $db_server, $db_name, $db_user, $db_pass, $datadir) {
		$username	= strtolower(str_replace(' ', '', $username));
		$datadir	= ($datadir != "") ? rtrim($datadir, '/') . '/' : dirname(dirname(__DIR__)) . "/docs/";
		$db_server	= (strlen($db_server) > 0) ? $db_server : 'localhost';
		$db_name	= (strlen($db_name) > 0) ? $db_name : 'simpledrive';
		$db_setup;

		// Check if datadir contains '.' or '../'
		if (preg_match('/(\.\.\/|\.)/', $datadir)) {
			throw new Exception('Path for data directory not allowed', '400');
		}

		// Check if username contains certain special characters
		if (preg_match('/(\/|\.|\<|\>|%)/', $username)) {
			throw new Exception('Username not allowed', '400');
		}

		// Check if already installed
		if (file_exists(CONFIG)) {
			throw new Exception('Already installed', '403');
		}

		try {
			$db_setup = Database::setup($username, $pass, $db_server, $db_name, $db_user, $db_pass);

			// Set log path in htaccess
			$this->update_main_htaccess();

			// Create documents folder
			if (!file_exists($datadir) && !mkdir($datadir, 0755)) {
				throw new Exception('Could not create documents folder', '500');
			}

			// Create user directory
			if (!file_exists($datadir . $username) && !mkdir($datadir . $username, 0755)) {
				throw new Exception('Could not create user directory', '500');
			}

			// Write config file
			if (!$this->create_config($datadir, $db_server, $db_name, $db_setup['user'], $db_setup['pass'], $mail, $mail_pass)) {
				throw new Exception('Could not write config file', '500');
			}

			$this->db = Database::getInstance();

			//cache_add($filename, $parent, $type, $size, $owner, $edit, $md5, $path) {
			if ($id = $this->db->user_create($username, Crypto::generate_password($pass), 1, $mail)) {
				return $this->db->session_start($id);
			}
		} catch (Exception $e) {
			if (file_exists(CONFIG)) {
				unlink(CONFIG);
			}
			Util::log($e->getTrace());
			throw new Exception($e->getMessage(), $e->getCode());
		}

		unlink(CONFIG);
		throw new Exception('Could not create user', '500');
	}

	/**
	 * Write setup info to config
	 * @param datadir location of the docs-folder
	 * @param db_server
	 * @param db_name
	 * @param db_user
	 * @param db_pass
	 * @param mail (optional)
	 * @param mail_pass (optional)
	 * @return boolean true if successful
	 */

	private function create_config($datadir, $db_server, $db_name, $db_user, $db_pass, $mail, $mail_pass) {
		$config = array(
			'salt'			=> Crypto::random_string(64),
			'installdir'	=> dirname($_SERVER['PHP_SELF']) . "/",
			'datadir'		=> $datadir,
			'dbserver'		=> $db_server,
			'dbname'		=> $db_name,
			'dbuser'		=> $db_user,
			'dbpass'		=> $db_pass,
			'mail'			=> $mail,
			'mailpass'		=> $mail_pass,
			'domain'		=> $_SERVER['HTTP_HOST'],
			'protocol'		=> 'http://'
		);

		// Write config file
		return file_put_contents(CONFIG, json_encode($config, JSON_PRETTY_PRINT));
	}

	/**
	 * Update log-location in htaccess
	 * @return boolean true if successful
	 */

	private function update_main_htaccess() {
		$lines = file('.htaccess');
		$write = '';

		foreach ($lines as $line) {
			if (strpos($line, 'php_value error_log') !== false) {
				$write .= 'php_value error_log ' . $_SERVER['DOCUMENT_ROOT'] . dirname($_SERVER['SCRIPT_NAME']) . "/logs/error.log" . PHP_EOL;
			}
			else {
				$write .= str_replace(array("\r", "\n"), '', $line) . PHP_EOL;
			}
		}

		return file_put_contents('.htaccess', $write);
	}

	/**
	 * Ensure user directories are not publicly readable
	 */

	private function create_user_htaccess() {
		$config = json_decode(file_get_contents(CONFIG), true);

		if (!file_exists($config['datadir'] . '/.htaccess')) {
			$data =
			'Order Allow,Deny
			Deny from all';

			file_put_contents($config['datadir'] . '/.htaccess', $data);
		}
	}

	/**
	 * Initiate token generation
	 * After 3 login attempts add a 30s cooldown for every further attempt to slow down bruteforce attacks
	 * @param username
	 * @param pass
	 * @return string authorization token
	 */

	public function login($username, $pass, $two_factor_code = null, $remember = false) {
		$this->db	= Database::getInstance();
		$username	= strtolower($username);
		$user		= $this->db->user_get_by_name($username, true);

		// User unknown
		if (!$user) {
			$this->db->log_write(PUBLIC_USER_ID, "warning", "Login", "Unknown login attempt: " . $username);
		}
		// User is on lockdown
		else if ((time() - ($user['login_attempts'] - 2) * 30) - $user['last_login_attempt'] < 0) {
			$lockdown_time = (time() - ($user['login_attempts'] + 1 - 2) * 30) - $user['last_login_attempt'];
			throw new Exception('Locked for ' . abs($lockdown_time) . 's', '500');
		}
		// Correct
		else if (Crypto::verify_password($pass, $user['pass'])) {
			// Check if Two-Factor-Authentication is required and if so can be unlocked
			if (Twofactor_Model::unlock($user['id'], $two_factor_code, $remember)) {
				// Protect user directories
				$this->create_user_htaccess();

				return $this->db->session_start($user['id']);
			}

			throw new Exception('Two-Factor-Authentication required', '403');
		}
		// Wrong password
		else {
			$this->db->user_increase_login_counter($user['id'], time());
			$this->db->log_write($user['id'], "Warning", "Login", "Login failed");
		}

		header('WWW-Authenticate: BasicCustom realm="simpleDrive"');
		throw new Exception('Wrong username/password', '401');
	}

	public function logout($token) {
		$this->db = Database::getInstance();
		$this->db->session_end($token);

		unset($_COOKIE['token']);
		setcookie('token', null, -1, '/');
	}

	/**
	 * Get current installed version and recent version (from demo server)
	 * @return array containing current and version
	 */
	public function get_version($token) {
		$this->db = Database::getInstance();
		if (!$this->db->user_get_by_token($token)) {
			throw new Exception('Permission denied', '403');
		}

		$version		= json_decode(file_get_contents(VERSION), true);
		$url			= 'http://simpledrive.org/version';
		$recent_version	= null;

		// Get current version from demo server if connection is available
		if (@fopen($url, 'r')) {
			$result = json_decode(file_get_contents($url, false), true);
			$recent_version = ($result && $result['build'] > $version['build']) ? $result['version'] : null;
		}

		return array('recent' => $recent_version, 'current' => $version['version']);
	}
}
