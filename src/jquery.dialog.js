/* jshint undef:true, jquery:true, browser: true */

/**
 *	jQuery plugin to create a dialog
 *
 *	This supports modal and none modal dialogs
 *	Dialogs are stacked in creation order or modal order
 *	
 *	Dialogs are not moveable or resizable	
 *
 *	@requires jQuery
 *	@requires Function.prototype.bind
 *	@requires Array.prototype.forEach
 *	@requires Array.prototype.indexOf
 */
( function( $, window ) {

	"use strict";

	var $window = $(window);

	// Change this to change the CSS and event namespace
	var namespace = 'dialog';

	// Ordering stack for modal dialogs
	var stack = [];
	// Counter for generating IDs
	var counter = 0;
	// Are the global keypress and click events setup
	var hasGlobalEvents = false;
	// Has the browser been setup and tested
	var isSetup = false;
	// Reference to the mask
	var $mask = null;

	var supportsFixed = true;
	var supportsFlexBox = true;
	var supportsTransform = false;
	var supportsResizingScrollableChildren = true;

	// Not entirely efficent micro templater
	// Replaces '{name}' with the value from data
	function templater( str, data ){	
		return str.replace( /\{([^}]+)\}/g, function( m, name ) {
			return data[name] || '';
		} );
	}

	// Inital setup.  Create the mask and run any feature tests
	function setup() {

		if ( isSetup ) {
			return;
		}

		$mask = $('<div class="' + namespace + '__mask">')
			.hide()
			.appendTo('body');

		var $test = $('<div class="' + namespace + '" style="max-height:0;height:auto;"><p class="' + namespace + '__main" style="height:100px;color:red;padding:0;border:0;"></p></div>').appendTo('body');
		supportsFixed = $test.css('position') === 'fixed';
		supportsFlexBox = $test.css('display').indexOf('flex') > -1;

		// If transform fails to work the dialog should be just right of the center
		// Use + 1 to avoid rounding errors
		// If it works it should be centered and the edge will be left of the center
		supportsTransform = $test.offset().left + 1 < $window.width()/2;

		// In IE, if the container contains a child with "overflow-y: auto",
		// it will not shrink that child and it overflows out
		// This is partly fixed in IE11, where this only happens if the the container
		// has no explict height
		supportsResizingScrollableChildren = $test.find( '.' + namespace + '__main' ).height() === 0;
		$test.remove();
		isSetup = true;
	}

	/**
	 * Find the top modal dialog and recover from a missing dialog
	 */
	function getTopModalDialog() {
		var dialog = stack.slice(-1)[0];
		if ( !dialog ) {
			// Something has gone wrong - recover gracefully
			hideModal();
			return null;
		}
		if ( !dialog.$dialog.is(':visible') ) {
			// Again, this shouldn't happen, ignore this one and get the next
			stack.pop();
			return getTopModalDialog();
		}

		return dialog;
	}

	/**
	 *	Check if the top dialog contains the focus and if it does't
	 *	force it to.
	 */
	function checkFocus(e) {

		var dialog = getTopModalDialog();
		if ( !dialog ) {
			return;
		}

		var el = dialog.$dialog[0];
		var target = e.target;

		if ( target !== el && !$.contains( el, target ) ) {
			dialog._focus(true);
		}

	}

	// Find all focusable elements in $el
	// Including imagemaps is left as an exercise for the reader
	function getFocusable($el) {

		return $el
			.find( 'a[href],input,select,textarea,button,object,[tabindex]')
			.not(':disabled')
			.filter(':visible');

	}

	// Setup events to run if there is a modal dialog
	function setupGlobalEvents() {

		if ( hasGlobalEvents ) {
			return;
		}

		// Needs to be document for IE8
		$(document)
			.on( 'keydown.' + namespace, function(e) {
				// Close the top dialog using the escape key
				if 	( !e.isDefaultPrevented() && e.keyCode === 27 ) {
					e.preventDefault();
					var dialog = getTopModalDialog();
					if ( !dialog ) {
						return;
					}
					dialog.close();
				}
			} );

		$('body')
			.on( 'focusin.' + namespace, function(e) {
				// Keep the focus in the top dialog
				// All sorts of problems happen if you don't do this on a timeout
				setTimeout( function() {
					checkFocus(e);
				}, 0 );
			} );

		hasGlobalEvents = true;

	}

	// Remove the global events
	function removeGlobalEvents() {
		$('body').add(document).off( '.' + namespace );
		hasGlobalEvents = false;
	}

	// Does global stuff for showing a dialog
	function showModal(dialog) {

		// Remove the dialog from the stack if present
		var index = stack.indexOf(dialog);
		if ( index !== -1 ) {
			stack.splice( index, 1 );
		}

		// Add to the top of the stack
		stack.push(dialog);
		setupGlobalEvents();
		zIndex();
		$mask.show();

	}

	// Hide a modeal dialog
	function hideModal(dialog) {
		
		var index = stack.indexOf(dialog);
		if ( index > -1 ) {		
			stack.splice( index, 1 );
		}
		if ( !stack.length ) {
			$mask.hide();
			removeGlobalEvents();	
		} else {
			zIndex();
		}
	}

	// Set the z-indexes on the dialogs
	function zIndex() {

		var index = 0;
		var topIndex = stack.length - 1;
		stack.forEach( function(item,i) {
			var $dialog = item.$dialog;
			if ( !index ) {
				// Reset the z index
				$dialog.css( 'z-index', '' );
				// Get the default
				index = parseInt( $dialog.css( 'z-index' ), 10 ) || 1;
			}
			// Add the index
			if ( i === topIndex ) {
				$mask.css( 'z-index', ++index );
			}

			$dialog.css( 'z-index', ++index );
		} );
	}

	/**
	 *	Create a new dialogue and appends it to the document
	 *	@param {Object} options
	 *	@param {String} [options.title]
	 *	@param {Boolean} [options.content]
	 *	@param {Boolean} [options.footer]
	 *	@param {Boolean} [options.className]
	 *	@param {Boolean} [options.destroyOnClose]
	 */
	function Dialog(options) {

		if ( !(this instanceof Dialog) ) {
			return new Dialog(options);
		}

		setup();
		this._id = ++counter;
		this.returnValue = '';

		this._create(options);

	}

	var proto = {

		/**
		 *	Show the dialog
		 */
		show: function() {
			
			this.$dialog.show();
			this._position();
			this.openedBy = document.activeElement;
			this._focus();
			$window.on( 'resize.' + namespace + ':' + this._id, this._position.bind(this) );
		},

		/**
		 *	Show the dialog as a modal dialog
		 */
		showModal: function() {
			
			showModal(this);
			this.show();
		},

		/**
		 *	Close the dialog
		 */
		close: function(ret) {

			var $dialog = this.$dialog;

			if ( !$dialog.is(':visible') ) {
				return;
			}

			this.returnValue = String(ret);
			$dialog.hide();
			hideModal(this);

			$window.off( 'resize.' + namespace + ':' + this._id );

			// Return focus to the openning element
			if ( this.openedBy ) {
				this.openedBy.focus();
			}

			var event = $.Event('close');
			$dialog.trigger(event);
		},

		/**
		 *	Destroy a dialog.  Completely remove it from the DOM
		 */
		destroy: function() {
			this.close();
			this.$dialog.remove();
		},

		/**
		 *	Adds an event to the dialog	element
		 */
		on: function() {
			var $dialog = this.$dialog;
			$dialog.on.apply( $dialog, arguments );
			return this;
		},

		/**
		 *	Create the dialog
		 */
		_create: function(options) {

			options = options || {};
			var className = [
				namespace,
				options.className || '',
				supportsFixed ? '' : namespace + '--absolute' 
			].join(' ');

			var html = templater( (/* include "dialog-template.htm" */), {
				title: options.title || '',
				className: className,
				ns: namespace,
				count: this._id,
				role: options.role || 'dialog'
			} );

			var $dialog = $(html)
				.hide()
				.appendTo('body')
				.on( 'keydown', this._keydown.bind(this) )
				.on( 'click', '[data-action=close]', this.close.bind(this) );

			this.$content = $dialog.find( '.' + namespace + '__main' )
				.append(options.content);
			this.$footer = $dialog.find( '.' + namespace + '__footer' )
				.append(options.footer);
			this.$footer = $dialog.find( '.' + namespace + '__title' );

			this.$dialog = $dialog;

			if ( options.destroyOnClose ) {
				this.on( 'close', this.destroy.bind(this) );
			}
		},

		/**
		 *	Position the dialog centrally
		 *	This is almost all done with CSS, but some older browsers
		 *	and IE need a bit of JS to help them.
		 */
		_position: function() {

			var $dialog = this.$dialog;

			if ( !supportsFlexBox || !supportsResizingScrollableChildren ) {
				// All of IE
				var $content = this.$content;
				$dialog.css( 'height', '' );
				$content.css( 'height', '' );
				var height = $dialog.height();
				
				var headerHeight = $dialog.find( '.' + namespace + '__header' ).outerHeight() || 0;
				var footerHeight = this.$footer.outerHeight() || 0;
				$content.height( height - headerHeight - footerHeight );
			}
			
			if ( !supportsTransform && supportsFixed ) {
				// IE < 9
				$dialog.css( {
					marginLeft: -$dialog.width()/2,
					marginTop: -$dialog.height()/2
				} );
			}
		},

		/**
		 *	Set the focus.  If inTabbingOrder it will be set to first focusable element
		 *
		 *	Otherwise it is set to:
		 *  * the first focusable element in .dialog__main or below with an autofocus attribute
		 *  * the first focusable element in .dialog__main or below
		 *	* the close cross
		 *	* the dialog
 		 *	
		 *	@param {Boolean} [inTabbingOrder=false] If true focus in strict tabbing order
		 */
		_focus: function( inTabbingOrder ) {

			var $dialog = this.$dialog;
			var focusOn;

			var $focusable = getFocusable($dialog);

			if ( inTabbingOrder ) {
				focusOn = $focusable[0] || $dialog;
			} else {
				var close = $dialog.find( '.' + namespace + '__close' )[0];

				$focusable = $focusable.not(close);
				var $autofocus = $focusable.filter('[autofocus]');

				focusOn = $autofocus[0] ||
					$focusable[0] ||
					close ||
					$dialog;
			}

			$(focusOn).focus();
		},

		/**
		 *	Loop the focus round them tabbing
		 *
		 */
		_keydown: function(e) {
			if ( e.which !== 9 ) {
				return;
			} 
			var target = e.target;

			var $focusable = getFocusable(this.$dialog);
			if ( $focusable.last().is(target) && !e.shiftKey ) {
				e.preventDefault();
				$focusable.eq(0).focus();
			} else if ( $focusable.eq(0).is(target) && e.shiftKey ) {
				e.preventDefault();
				$focusable.last().focus();
			}
		}


	};

	// For the benefit of IE8.  Would prefer to use Object.create
	for ( var i in proto ) {
		Dialog.prototype[i] = proto[i];
	}

	$.Dialog = Dialog;

	
}( jQuery, window ) );