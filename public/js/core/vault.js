/**
 * @author		Kevin Schulz <paranerd.development@gmail.com>
 * @copyright	(c) 2017, Kevin Schulz. All Rights Reserved
 * @license		Affero General Public License <http://www.gnu.org/licenses/agpl>
 * @link		https://simpledrive.org
 */

$(document).ready(function() {
	Util.getVersion();

	VaultModel.fetch();
	VaultView.init();
	VaultController.init();
});

var VaultController = new function() {
	this.init = function() {
		this.addMouseEvents();
		this.addKeyEvents();
		this.addFormEvents();
	}

	this.addKeyEvents = function() {
		$(document).on('keydown', function(e) {
			switch(e.keyCode) {
				case 27: // Esc
					if (!VaultModel.preventClipboardClear) {
						Util.copyToClipboard("");
					}
					break;

				case 13: // Return
					// Open file if item is selected and nothing or filter has focus
					if (VaultModel.list.getSelectedCount() == 1 &&
						($(":focus").length == 0 || $(":focus").hasClass("filter-input")))
					{
						VaultView.showEntry();
					}
					break;

				case 46: // Del
					if (!$(e.target).is('input')) {
						VaultModel.remove();
					}
					break;

				case 38: // Up
					if (!e.shiftKey) {
						VaultModel.list.selectPrev();
					}
					break;

				case 40: // Down
					if (!e.shiftKey) {
						VaultModel.list.selectNext();
					}
					break;
			}
		});
	}

	this.addMouseEvents = function() {
		$("#autoscan.checkbox-box").on('click', function(e) {
			// This fires before checkbox-status has been changed
			var enable = $("#autoscan").hasClass("checkbox-checked") ? 0 : 1;
			UserModel.setAutoscan(enable);
		});

		$(".sidebar-navigation").on('click', function(e) {
			switch ($(this).data('action')) {
				case 'entries':
					// Do nothing
					break;
			}
		});

		$("#sidebar-create").on('click', function() {
			VaultModel.list.unselectAll();
		});

		$(".create-trigger").on('click', function() {
			VaultView.showCreateEntry($(this).data('type'));
		});

		$(document).on('click', '#checker', function(e) {
			VaultModel.list.toggleAllSelection();
		});

		$(document).on('click', '.popup:not(#password-generator) .close', function(e) {
			if (!VaultModel.preventClipboardClear) {
				Util.copyToClipboard("");
			}
		});

		$(document).on('mousedown', '#shield', function(e) {
			if (!VaultModel.preventClipboardClear) {
				Util.copyToClipboard("");
			}
		});

		$("#entries").on('mousedown', function(e) {
			if ($(e.target).closest('.item').length == 0 && !$(e.target).is('input')) {
				VaultModel.list.unselectAll();
			}
		});

		$(document).on('mousedown', '.item', function(e) {
			if ($(e.target).is(".thumbnail, .shared, input")) {
				return;
			}

			if (!$(this).closest('.item').hasClass("selected")) {
				VaultModel.list.unselectAll();
			}

			VaultModel.list.select(this.value);
		});

		$(document).on('click', '.item', function(e) {
			// When click on thumbnail or shared-icon, only select!
			if ($(e.target).is(".thumbnail, .shared, input")) {
				return;
			}

			if (e.which == 1) {
				VaultModel.list.unselectAll();
				VaultModel.list.select(this.value);
				VaultView.showEntry();
			}
		});

		$(document).on('mouseup', '.thumbnail', function(e) {
			var id = $(this).closest('.item').val();
			VaultModel.list.toggleSelection(id);
		});

		$("#passgen-copy").on('click', function(e) {
			VaultModel.preventClipboardClear = true;
			Util.copyToClipboard($("#passgen-password").text());
		});

		/**
		 * Prepare contextmenu
		 */
		$(document).on('contextmenu', '#content-container', function(e) {
			e.preventDefault();
			var target = (typeof e.target.value != "undefined") ? VaultModel.list.get(e.target.value) : ((typeof e.target.parentNode.value != "undefined") ? VaultModel.list.get(e.target.parentNode.value) : null);
			var multi = (VaultModel.list.getSelectedCount() > 1);

			$('[id^="context-"]').addClass("hidden");
			$("#contextmenu hr").addClass("hidden");

			$("#context-passphrase").removeClass("hidden");

			if (target) {
				if (!multi) {
					// Edit
					$("#context-edit").removeClass("hidden");
					$("#contextmenu hr").removeClass("hidden");
				}

				// Delete
				$("#context-delete").removeClass("hidden");
			}

			Util.showContextmenu(e);
		});

		/**
		 * Contextmenu action
		 */
		$("#contextmenu .menu li").on('click', function(e) {
			var id = $(this).attr('id')
			var action = id.substr(id.indexOf('-') + 1);

			switch (action) {
				case 'passphrase':
					VaultView.showChangePassphrase();
					break;
				case 'edit':
					VaultView.showEntry();
					break;

				case 'delete':
					VaultModel.remove();
					break;
			}

			$("#contextmenu").addClass("hidden");
		});
	}

	this.addFormEvents = function() {
		$("#unlock").on('submit', function(e) {
			e.preventDefault();
			VaultModel.unlock($("#unlock-passphrase").val());
		});

		$("#passphrase").on('submit', function(e) {
			e.preventDefault();
			VaultModel.setPassphrase($("#passphrase-passphrase").val());
		});

		$("#change-passphrase").on('submit', function(e) {
			e.preventDefault();
			VaultModel.changePassphrase($("#change-passphrase-pass1").val(), $("#change-passphrase-pass2").val());
		});

		$("form[id^='entry']").on('submit', function(e) {
			e.preventDefault();
			VaultModel.saveEntry($(this).data('type'));
		});

		$("#password-generator").on('submit', function(e) {
			e.preventDefault();
			var useUppercase = $("#passgen-upper").hasClass("checkbox-checked");
			var useLowercase = $("#passgen-lower").hasClass("checkbox-checked");
			var useNumbers = $("#passgen-numbers").hasClass("checkbox-checked");
			var useSpecials = $("#passgen-specials").hasClass("checkbox-checked");
			var length = $("#passgen-length").val();

			var rand = Crypto.randomString(useUppercase, useLowercase, useNumbers, useSpecials, length);
			$("#passgen-password").text(rand);
		});
	}
}

var VaultView = new function() {
	this.init = function() {
		$(window).resize();
	}

	this.showUnlock = function() {
		Util.showPopup("unlock", true);
	}

	this.showSetPassphrase = function() {
		Util.showPopup("passphrase", true);
	}

	this.showChangePassphrase = function() {
		Util.showPopup("change-passphrase");
	}

	this.showCreateEntry = function(type) {
		$("#" + type + "-title-edit").addClass('hidden');
		$("#" + type + "-title-new").removeClass('hidden');
		$("#entry-website-open-url").addClass("hidden");
		Util.showPopup("entry-" + type);
	}

	this.showEntry = function() {
		var selection = VaultModel.list.getFirstSelected();
		var item = selection.item;

		$("#" + item.type + "-title-edit").removeClass('hidden');
		$("#" + item.type + "-title-new").addClass('hidden');
		Util.showPopup("entry-" + item.type);

		$("#entry-" + item.type + "-title").val(item.title);
		$("#entry-" + item.type + "-type").val(item.type);
		$("#entry-" + item.type + "-category").val(item.category);

		if (item.type == 'website') {
			$("#entry-website-url").val(item.url);
			$("#entry-website-user").val(item.user);
			$("#entry-website-pass").val(item.pass);
			$("#entry-website-open-url a").attr("href", Util.generateFullURL(item.url));

			if (item.url) {
				$("#entry-website-open-url").removeClass("hidden");
			}
			else {
				$("#entry-website-open-url").addClass("hidden");
			}

			$("#entry-website-copy-user").off('click').on('click', function() {
				VaultModel.preventClipboardClear = false;
				Util.copyToClipboard(item.user);
				Util.notify("Copied username to clipboard", true, false);
			});

			$("#entry-website-copy-pass").off('click').on('click', function() {
				VaultModel.preventClipboardClear = false;
				Util.copyToClipboard(item.pass);
				Util.notify("Copied password to clipboard", true, false);
			});
		}
		else if (item.type == 'note') {
			$("#entry-" + item.type + "-content").val(item.content);
		}
	}

	this.display = function(entries) {
		for (var i in entries) {
			var item = entries[i];

			var listItem = document.createElement("div");
			listItem.id = "item" + i;
			listItem.value = i;
			listItem.className = "item";
			simpleScroll.append("entries", listItem);

			// Thumbnail
			var thumbnailWrapper = document.createElement("span");
			thumbnailWrapper.className = "item-elem col0";
			listItem.appendChild(thumbnailWrapper);

			var thumbnail = document.createElement('span');
			thumbnail.className = "thumbnail icon-" + item.type;
			thumbnailWrapper.appendChild(thumbnail);

			// Title
			var title = document.createElement("span");
			title.className = "item-elem col1";
			title.innerHTML = Util.escape(item.title);
			listItem.appendChild(title);

			// Category
			var category = document.createElement("span");
			category.className = "item-elem col2";
			category.innerHTML = item.category;
			listItem.appendChild(category);

			// Type
			var type = document.createElement("span");
			type.className = "item-elem col3";
			type.innerHTML = item.type;
			listItem.appendChild(type);

			// Edit
			var edit = document.createElement("span");
			edit.className = "item-elem col5";
			edit.innerHTML = Util.timestampToDate(item.edit);
			listItem.appendChild(edit);
		}
	}
}

var VaultModel = new function() {
	var self = this;
	this.passphrase = "";
	this.encrypted = "";
	this.preventClipboardClear = false;

	this.list = new List("entries", VaultView.display);
	this.clipboard = {};

	this.saveEntry = function(type) {
		// Get item if editing - empty object if creating
		var item = (self.list.getSelectedCount() > 0) ? self.list.getFirstSelected().item : {};

		// Require title
		var origTitle = (item.title) ? item.title : $("#entry-" + type + "-title").val();
		if ($("#entry-" + type + "-title").val() == "") {
			Util.showFormError('entry-' + type, 'No title provided');
			return;
		}

		// Check if title already exists
		var index = Util.searchArrayForKey(self.list.getAll(), 'title', origTitle);
		if (!item.title && index != null) {
			Util.showFormError('entry-' + type, 'Entry already exists');
			return;
		}

		// Block form submit
		$("#entry-" + type + " .btn").prop('disabled', true);

		// Set data
		item.title = $("#entry-" + type + "-title").val();
		item.category = $("#entry-" + type + "-category").val();
		item.type = type;
		item.logo = "";
		item.edit = Date.now();

		if (item.type == 'website') {
				item.url = Util.generateFullURL($("#entry-" + type + "-url").val());
				item.user = $("#entry-" + type + "-user").val();
				item.pass = $("#entry-" + type + "-pass").val();
		}
		else if (item.type == 'note') {
			item.content = $("#entry-" + type + "-content").val();
		}

		// Update/create entry
		if (index) {
			self.list.update(index, item);
		}
		else {
			self.list.add(item);
		}

		// Unblock submit and close popup
		$("#entry-" + type + " .btn").prop('disabled', false);
		Util.closePopup('entry-' + type, true);

		// Save
		self.save();
	}

	this.save = function() {
		if (self.passphrase == '') {
			VaultView.showSetPassphrase();
			return;
		}

		var bId = Util.startBusy("Saving...");

		setTimeout(function() {
			try {
				var vaultString = JSON.stringify(self.list.getAll());
				var encryptedVault = Crypto.encrypt(vaultString, self.passphrase.toString());

				$.ajax({
					url: 'api/vault/save',
					type: 'post',
					data: {vault: encryptedVault},
					dataType: "json"
				}).done(function(data, statusText, xhr) {
					Util.notify("Saved.", true, false);
				}).fail(function(xhr, statusText, error) {
					Util.notify(Util.getError(xhr), true, true);
				}).always(function() {
					Util.endBusy(bId);
				});
			} catch(e) {
				Util.notify("Error encrypting", true, true);
				Util.endBusy(bId);
				return;
			}
		}, 100);
	}

	this.remove = function() {
		Util.showConfirm('Delete entry?', function() {
			var all = self.list.getAll();
			var selected = self.list.getAllSelected();
			for (var s in selected) {
				for (var i in all) {
					if (all[i].title == selected[s].title) {
						all.splice(i, 1);
					}
				}
			}

			self.save();
		});
	}

	this.fetch = function() {
		var bId = Util.startBusy("Loading...");

		$.ajax({
			url: 'api/vault/get',
			type: 'post',
			data: {},
			dataType: "json"
		}).done(function(data, statusText, xhr) {
			if (data.msg) {
				self.encrypted = data.msg;
				VaultView.showUnlock();
			}
			else {
				VaultView.showSetPassphrase();
			}
		}).fail(function(xhr, statusText, error) {
			Util.notify(Util.getError(xhr), true, true);
		}).always(function() {
			Util.endBusy(bId);
		});
	}

	this.unlock = function(passphrase) {
		var bId = Util.startBusy("Decrypting...");

		setTimeout(function() {
			try {
				var dec = Crypto.decrypt(self.encrypted, passphrase);
				self.passphrase = passphrase;
				if (dec) {
					self.list.setData(JSON.parse(dec), 'title');
				}

				Util.closePopup("unlock", false, true);
				Util.endBusy(bId);
			} catch(e) {
				Util.showFormError("unlock", "Wrong passphrase");
				Util.endBusy(bId);
			}
		}, 100);
	}

	this.setPassphrase = function(passphrase) {
		if (passphrase) {
			self.passphrase = passphrase;
			Util.closePopup("passphrase", false, true);
		}
		else {
			Util.showFormError('passphrase', 'Please enter a passphrase');
		}
	}

	this.changePassphrase = function(pass1, pass2) {
		if (pass1 == "" || pass2 == "") {
			Util.showFormError('change-passphrase', 'No empty fields!');
			return;
		}

		if (pass1 != pass2) {
			Util.showFormError('change-passphrase', 'Passphrases do not match');
			return;
		}

		if (pass1 != self.passphrase) {
			self.passphrase = pass1;
			this.save();
		}

		Util.closePopup('change-passphrase');
	}
}