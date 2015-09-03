# Dialag

A jQuery plugin that creates an accessible modal dialog that is vertically and horizontally centred on the screen.

Based on best practice summarised here:

* http://www.nczonline.net/blog/2013/02/12/making-an-accessible-dialog-box/

## Support

Work in IE8+ and all other browsers.  It can work in IE6 and 7, but the CSS will need more work.

If a browser doesn't support fixed positioning then the dialog will absolutely positioned at the top of the page.

The script uses HTML5 elements, `Function.prototype.bind`, `Array.prototype.forEach` and `Array.prototype.indexOf`.  For [older browers](http://kangax.github.io/compat-table/es5/) you will need to add https://github.com/es-shims/es5-shim and https://github.com/aFarkas/html5shiv to your project.

## Usage

`jQuery.Dialog()` creates a new dialog and returns a dialog object.
The API of this object roughly follows the API of the [HTML5 `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement) with a few extra features.

```js

// You can omit new if you prefer
var dialog = new $.Dialog( {
	
	title: 'Dialog title',

	// String or jQuery collection
	content: '<p>Content</p>',
	
	// String or jQuery collection
	footer: '<p>My footer content</p>',

	// Optional additional classes
	className: 'dialog--whatever',

	// If true closing the dialog also calls destroy.  Defaults to false
	destroyOnClose: true, 

	// Set the aria-role attribute. Defaults to 'dialog'
	// See http://www.w3.org/TR/wai-aria/roles#widget_roles_header
	role: 'alertdialog',

	// Set the label on the close button.  Defaults to "Close".
	closeLabel: 'Close'
} );

// Show the dialog
dialog.show();

// Show the dialog as a modal dialog
dialog.showModal();

// Close the dialog.  `value` will set the `returnValue` property.
// Closing the dialog emits a `close` event on the dialog
dialog.close(value);

// Remove the dialog from the DOM
dialog.destory();

// A shortcut for dialog.$dialog.on(), chainable
dialog.on( type, selector, fn );

// References to parts of the dialog as jQuery collections 
dialog.$dialog // the dialog
dialog.$title // The title
dialog.$content // The main content
dialog.$footer // The footer content
```

## HTML

See the \src\dialog-template.htm file for the HTML of a dialog.

## CSS

The CSS in \dist\dialog.css is meant as a guide.

## Building

There is a build process that uses Gulp.  You need to install node.js first.

```bash
# Within the project directory
# First install the dependancies
npm install

# Run the build process
npm run build
# Or if you've installed gulp globally
gulp
```
