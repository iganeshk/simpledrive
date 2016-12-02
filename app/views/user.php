<?php

/**
 * @author		Kevin Schulz <paranerd.development@gmail.com>
 * @copyright	(c) 2016, Kevin Schulz. All Rights Reserved
 * @license		Affero General Public License <http://www.gnu.org/licenses/agpl>
 * @link		http://simpledrive.org
 */

	if (!$user) {
		header('Location: ' . $base . 'core/login');
		exit();
	}

	$token		= (isset($_COOKIE['token'])) ? $_COOKIE['token'] : null;
	$code		= (isset($_GET['code'])) ? $_GET['code'] : "";
	$username 	= ($user) ? $user['username'] : '';
	$admin 		= ($user) ? $user['admin'] : false;
	$color 		= ($user) ? $user['color'] : 'light';
	$fileview 	= ($user) ? $user['fileview'] : 'list';
?>

<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
	<title>User settings | simpleDrive</title>

	<base href="<?php echo $base; ?>">

	<link rel="stylesheet" href="public/css/icons.css" />
	<link rel="stylesheet" href="public/css/layout.css" />
	<link rel="stylesheet" href="public/css/colors.css" />
	<link rel="stylesheet" href="public/css/fileviews.css" />
	<link rel="shortcut icon" href="favicon.ico" type="image/x-icon">
</head>

<body class="<?php echo $color; ?>">
	<!-- Header -->
	<div id="header">
		<!-- Title -->
		<div id="logo" class="menu-item" title="Return to files">
			<a href="files" class="back">
				<div class="menu-thumb back-icon icon-arrow-left"></div>
				<span class="logo-text">Settings</span>
			</a>
		</div>
		<div id="path"><div class="path-element path-current">User Settings</div></div>
		<div id="username"></div>
	</div>

	<!-- Sidebar -->
	<div id="sidebar">
		<div id="sidebar-general" class="menu-item focus" title="Status info"><div class="menu-thumb icon-info"></div><div class="menu-text">General</div></div>
	</div>

	<!-- Content -->
	<div id="content">
		<div id="status" class="hidden">
			<div class="settings-title">Quota</div>
			<div class="row">
				<div class="cell settings-label">Total</div>
				<div class="cell" id="mem-total">Loading...</div>
			</div>
			<div class="row">
				<div class="cell settings-label">Used</div>
				<div class="cell" id="mem-used">Loading...</div>
			</div>

			<div class="divider"></div>

			<div class="settings-title">Security</div>
			<div class="row">
				<div class="cell settings-label">Password</div>
				<div class="cell"><button id="change-password-button" class="button">Change</button></div>
			</div>
			<div class="row">
				<div class="cell settings-label">Active token (<span id="active-token">0</span>)</div>
				<div class="cell"><button id="invalidate-token" class="button">Invalidate</button></div>
			</div>

			<div class="divider"></div>

			<div class="settings-title">Backup</div>
			<div class="row">
				<div class="cell settings-label">Cloud Backup</div>
				<div class="cell">
					<button id="backup-toggle-button" class="button hidden">Start</button>
					<button id="backup-enable-button" class="button">loading...</button>
				</div>
			</div>

			<div class="divider"></div>

			<div class="settings-title">Appearance</div>
			<div class="row">
				<div class="cell settings-label">Color theme</div>
				<div class="cell">
					<select id="color">
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</select>
				</div>
			</div>
			<div class="row">
				<div class="cell settings-label">Fileview</div>
				<div class="cell">
					<select id="fileview">
						<option value="list">List</option>
						<option value="grid">Grid</option>
					</select>
				</div>
			</div>

			<div class="divider"></div>

			<div class="settings-title">Misc</div>
			<div class="row">
				<div class="cell settings-label multi-line">Auto-Scan<br><span class="settings-info">Scan directories to cache before listing. Disable if you only insert data through simpleDrive-Interface.</span></div>
				<div class="cell"><div class="checkbox"><div id="autoscan" class="checkbox-box icon-check"></div></div></div>
			</div>
			<div class="row">
				<div class="cell settings-label">Temp Folder</div>
				<div class="cell"><button id="clear-temp-button" class="button">Clear</button></div>
			</div>

			<div class="divider"></div>
		</div>
	</div>

	<!-- Menu -->
	<div id="menu" class="popup hidden">
		<div class="menu-item"><a href="files"><div class="menu-thumb icon-files"></div>Files</a></div>
		<div class="menu-item"><a href="user"><div class="menu-thumb icon-settings"></div><?php echo $lang['settings']; ?></a></div>
		<?php if ($admin) : ?>
		<div class="menu-item"><a href="system"><div class="menu-thumb icon-admin"></div>System</a></div>
		<?php endif; ?>
		<div id="menu-item-info" class="menu-item"><div class="menu-thumb icon-info"></div><?php echo $lang['info']; ?></div>
		<div class="menu-item"><a href="core/logout?token=<?php echo $token; ?>"><div class="menu-thumb icon-logout"></div><?php echo $lang['logout']; ?></a></div>
	</div>

	<!-- Shield -->
	<div id="shield" class="overlay hidden"></div>

	<!-- Backup password popup -->
	<form id="setupbackup" class="popup hidden center input-popup" action="#">
		<div class="popup-title">Enable cloud backup</div>

		<input id="setupbackup-pass1" class="input-wide" type="password" placeholder="Password" required></input>
		<input id="setupbackup-pass2" class="input-wide" type="password" placeholder="Password (repeat)" required></input>

		<div class="checkbox">
			<div id="setupbackup-encrypt" class="checkbox-box"></div>
			<div class="checkbox-label">Encrypt filenames</div>
		</div>
		<button class="button">OK</button>
	</form>

	<!-- User password popup -->
	<form id="change-password" class="popup input-popup center hidden" action="#">
		<span class="close"> &times;</span>
		<div class="popup-title">Change password</div>

		<div class="input-header">Current password</div>
		<input id="change-password-pass0" type="password" class="input-wide" placeholder="Current password"></input>

		<div class="input-header">New password</div>
		<input id="change-password-pass1" type="password" class="input-wide" placeholder="New password"></input>

		<div class="input-header">New password (repeat)</div>
		<input id="change-password-pass2" type="password" class="input-wide" placeholder="New password (repeat)"></input>

		<div id="change-password-error" class="error hidden"></div>
		<button class="button">OK</button>
	</form>

	<!-- Notification -->
	<div id="notification" class="center-hor notification-info light hidden">
		<div id="note-icon" class="icon-info"></div>
		<div id="note-msg"></div>
		<span class="light close"> &times;</span>
	</div>

	<!-- Version info -->
	<div id="info" class="popup center hidden">
		<div id="info-title">simpleDrive</div>
		<div id="info-subtitle">Private. Secure. Simple.</div>
		<div class="clearer"></div>
		<div id="info-footer">paranerd 2013-2016 | <a href="mailto:paranerd.development@gmail.com">Contact Me!</a></div>
	</div>

	<input id="data-username" type="hidden" value="<?php echo $username; ?>"/>
	<input id="data-token" type="hidden" value="<?php echo $token; ?>"/>
	<input id="data-code" type="hidden" value="<?php echo $code; ?>"/>

	<script type="text/javascript" src="public/js/jquery-1.11.3.min.js"></script>
	<script type="text/javascript" src="public/js/simplescroll.js"></script>
	<script type="text/javascript" src="public/js/util.js"></script>
	<script type="text/javascript" src="public/js/user.js"></script>
</body>
</html>
