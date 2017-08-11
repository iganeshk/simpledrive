/**
 * @author		Kevin Schulz <paranerd.development@gmail.com>
 * @copyright	(c) 2017, Kevin Schulz. All Rights Reserved
 * @license		Affero General Public License <http://www.gnu.org/licenses/agpl>
 * @link		http://simpledrive.org
 */

var ImageManager = new function() {
	var self = this;
	this.loading = false;
	this.active = null;
	this.slide = null;
	this.slideshowStarted = false;
	this.image = null;

	this.abort = function() {
		self.loading = false;
		window.stop();
	}

	this.close = function() {
		self.slideshow(true);

		if (self.loading) {
			self.abort();
		}
	}

	this.getBackgroundSize = function(img) {
		var imgHeight = img.naturalHeight || img.height;
		var imgWidth = img.naturalWidth || img.width;

		if (imgHeight > $(window).height() || imgWidth > $(window).width()) {
			return "contain"
		}
		return "auto";
	}

	this.init = function() {
		$("#img-close").on('click', function(e) {
			self.close();
		});

		$("#img-delete").on('click', function(e) {
			self.remove();
		});

		$("#img-slideshow").on('click', function(e) {
			self.slideshow(false);
		});

		$("#img-prev").on('click', function(e) {
			self.prev();
		});

		$("#img-next").on('click', function(e) {
			self.next();
		});
	}

	this.next = function(slideshow) {
		if (!self.active || (slideshow && !self.slideshowStarted)) {
			return;
		}

		var files = FileModel.list.getAllFiltered();
		for (var i = parseInt(self.active) + 1; i < parseInt(self.active) + files.length + 1; i++) {
			if (files[i % files.length].type == 'image') {
				self.open(i % files.length);
				return (i % files.length);
			}
		}
	}

	this.open = function(id) {
		self.active = id;

		if (!self.loading) {
			self.loading = true;
		}
		else {
			self.abort();
		}

		var elem = FileModel.list.get(id);

		// Reset image
		$("#img-viewer").find("img").remove();

		var url = encodeURI('api/files/get?target=' + JSON.stringify([elem.id]) + '&width=' + window.innerWidth + '&height=' + window.innerHeight + '&token=' + Util.getToken());
		self.setThumbnailAsBackground(elem.filename, id);
		self.display(elem.filename, id, url);
	}

	this.display = function(filename, id, url) {
		var bId = Util.startBusy();
		$("#img-viewer").removeClass("hidden");
		var img = new Image();

		var start = Date.now();
		var interval = setInterval(function() {
			if (img.naturalHeight || img.height) {
				clearTimeout(interval);
				if (id != self.active) {
					return;
				}
				$("#img-viewer").children('img').remove();
				var dim = self.scale(img);

				img.style.position = "absolute";
				img.style.height = dim.height + "px";
				img.style.width = dim.width + "px";
				img.style.left = ((window.innerWidth - dim.width) / 2) + "px";
				img.style.top = ((window.innerHeight - dim.height) / 2) + "px";

				$("#img-viewer").append(img);
				$("#img-title").text(filename);
			}
		}, 100);

		img.onload = function() {
			self.loading = false;
			Util.endBusy(bId);
		}

		img.onerror = function() {
			if (id != self.active) {
				return;
			}
			clearTimeout(interval);
			Util.notify("Error displaying image", true, true);
			self.loading = false;
			Util.endBusy(bId);
		}

		img.src = url;
	}

	this.scale = function(img) {
		var imgHeight = img.naturalHeight || img.height;
		var imgWidth = img.naturalWidth || img.width;

		var scaleTo = (imgHeight > window.innerHeight || imgWidth > window.innerWidth) ? Math.min(window.innerHeight / imgHeight, window.innerWidth / imgWidth) : 1;
		var coverArea = 0.9;

		var targetWidth = (imgWidth * scaleTo) * coverArea;
		var targetHeight = (imgHeight * scaleTo) * coverArea;

		return {width: targetWidth, height: targetHeight};
	}

	this.setThumbnailAsBackground = function(filename, id) {
		var bg = $("#item" + id + " .thumbnail").css('background-image');
		var url = bg.substr(bg.indexOf("api/"));
		url = url.substr(0, url.length -2);
		if (url) {
			self.display(filename, id, url);
		}
	}

	this.prev = function() {
		if (!self.active) {
			return;
		}

		var files = FileModel.list.getAllFiltered();
		for (var i = parseInt(self.active) - 1; i > parseInt(self.active) - files.length; i--) {
			var index = (i % files.length + files.length) % files.length;
			if (files[index].type == 'image') {
				self.open(index);
				return index;
			}
		}
	}

	this.remove = function() {
		if (!self.active) {
			return;
		}

		FileModel.list.select(self.active);
		FileModel.remove();

		if (self.prev() == null) {
			self.close();
		}
	}

	this.slideshow = function(forceClose) {
		if (!self.active) {
			return;
		}

		if (!self.slideshowStarted && !forceClose) {
			$("#img-slideshow .icon").removeClass('icon-play').addClass('icon-pause');
			self.slide = setInterval(function () {
				self.next(true);
			}, 2000);
			self.slideshowStarted = true;
		}
		else {
			$("#img-slideshow .icon").removeClass('icon-pause').addClass('icon-play');
			self.slideshowStarted = false;
			clearTimeout(self.slide);
		}
	}
}

ImageManager.init();