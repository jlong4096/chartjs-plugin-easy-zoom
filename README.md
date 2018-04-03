# chartjs-plugin-easy-zoom

A zoom plugin for Chart.js. Currently requires Chart.js >= 2.6.0
Zooming is done via the mouse wheel or via a pinch gesture.

[Live Codepen Demo](http://codepen.io/pen/PGabEK)

## Configuration

To configure the zoom and pan plugin, you can simply add new config options to your chart config.

```javascript
{	
	// Container for zoom options
	zoom: {
		// Boolean to enable zooming
		enabled: true,

		// Enable drag-to-zoom behavior
		drag: true,

		// Zooming directions. Remove the appropriate direction to disable 
		// Eg. 'y' would only allow zooming in the y direction
		mode: 'xy',
		rangeMin: {
			// Format of min zoom range depends on scale type
			x: null,
			y: null
		},
		rangeMax: {
			// Format of max zoom range depends on scale type
			x: null,
			y: null
		},
        distanceMin: {
            // Minimum distance can zoom
            x: null,
            y: null,
        }
	}
}
```

## API

### chart.resetZoom()

Programmatically resets the zoom to the default state. See [samples/zoom-time.html](samples/zoom-time.html) for an example.

## Installation

To download a zip, go to the chartjs-plugin-zoom.js on Github

To install via npm / bower:

```bash
npm install chartjs-plugin-zoom --save
```

Prior to v0.4.0, this plugin was known as 'Chart.Zoom.js'. Old versions are still available on npm under that name.

## Documentation

You can find documentation for Chart.js at [www.chartjs.org/docs](http://www.chartjs.org/docs).

Examples for this plugin are available in the [samples folder](samples).

## Contributing

Before submitting an issue or a pull request to the project, please take a moment to look over the [contributing guidelines](CONTRIBUTING.md) first.

## License

chartjs-plugin-zoom.js is available under the [MIT license](http://opensource.org/licenses/MIT).
