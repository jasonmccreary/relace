// save back to file
// ensure preserve spacing
// loop over whole directory
// output what changed
// options?


var chalk = require("chalk");
var cheerio = require('cheerio');
var $ = cheerio; // fake jQuery
var glob = require("glob");
var fs = require('fs');
var path = require('path');
var mkdirp = require("mkdirp");

//parse argument(s)
var args = require("nomnom")
    .options({
        globString: {
            position: 0,
            help: 'Glob pattern for the files to be processed.',
            required: true,
            type: 'string'
        },
        'outputDirectory': {
            abbr: 'o',
            help: 'Write processed files to this directory'
        }
    }).parse();

if (args.outputDirectory) {
    if (!fs.existsSync(args.outputDirectory) || !fs.lstatSync(args.outputDirectory).isDirectory()) {
        console.log(chalk.red("Output directory " + args.outputDirectory + " is invalid."));
        return;
    }
}

var filePaths = [];

if (args._.length > 1) {
    //cycle through all file names provided as arguments
    args._.forEach(function (inputFilePath) {
        filePaths.push(inputFilePath);
    });
} else {
    filePaths = glob.sync(args.globString);
}

filePaths.forEach(function (inputFilePath) {
    fs.readFile(inputFilePath, {encoding: 'utf8'}, function (error, data) {

        if (error) {
            console.log(chalk.red(error));
            return;
        }

        console.log(chalk.yellow("Processing: " + inputFilePath));

        var outputFilePath = inputFilePath;

        if (args.outputDirectory) {
            var outputFilePath = args.outputDirectory + "/" + inputFilePath;
        }

        var dom = cheerio.load(data, {
            decodeEntities: false
        });
        console.log(Upgrader.perform(dom, true, outputFilePath));
    });
});

var RULESET = [
    {
        title: "Update CSS/JS CDN Reference",
        description: "Inspect HTML for references to a recognized BootstrapCDN version of Bootstrap and swap it out for Bootstrap 3.",
        run: function (doc) {
            var count = 0;

            // Replace Bootstrap CDN CSS with 3.0.0-rc1 version
            doc("link[rel=stylesheet][href]").each(function () {
                $link = $(this);
                var href = $link.attr('href')
                if (href && href.match(new RegExp("//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.[0-2]/css/bootstrap-combined.(no-icons\.)?min.css"))) {
                    $link.attr("href", "//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css");
                    count++;
                }
            });

            // Replace Bootstrap CDN JS with 3.0.0-rc1 version
            doc("script[src]").each(function () {
                $script = $(this);
                var src = $script.attr('src')
                if (src && src.match(new RegExp("//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.[0-2]/js/bootstrap.min.js"))) {
                    $script.attr("href", "http://netdna.bootstrapcdn.com/bootstrap/3.0.0/js/bootstrap.min.js");
                    count++;
                }
            });

            return (count > 0) ? count + " Replaced " + this.title : false;
        }
    },

    {
        title: "Revamped Grid System",
        description: "Look for <code>spanX</code> non-form containers and replace with <code>col-lg-X</code> <code>col-md-X</code> <code>col-sm-X</code> (leaving mobile to collapse into a single column). Change <code>row-fluid</code> to <code>row</code> since they are now the same. Remove <code>container-fluid</code> since it is now a noop.",
        run: function (doc) {
            var count = 0;

            for (var i = 1; i <= 12; i++) {
                var sI = i.toString();
                doc(".offset" + sI).each(function () {
                    $this = $(this);
                    // Make sure we're dealing with a container, not a form element
                    if ($this.is("section, div, aside, article")) {
                        $this.removeClass("offset" + sI).addClass("col-lg-offset-" + sI);
                        count += $this.length;
                    }
                });

                doc(".span" + sI).each(function () {
                    $this = $(this);
                    // Make sure we're dealing with a container, not a form element
                    if ($this.is("section, div, aside, article")) {
                        $this.removeClass("span" + sI).addClass("col-sm-" + sI + " col-md-" + sI, " col-lg-" + sI);
                        count += $this.length;
                    }
                });
            }


            // Remove .row-fluid and replace with .row since they are equivalent now
            $fluidRows = doc(".row-fluid")
            if ($fluidRows.length > 0) {
                count += $fluidRows.length;
                $fluidRows.removeClass('row-fluid').addClass('row');
            }

            // Remove .container-fluid since it doesn't do anything
            $fluidContainers = doc(".container-fluid")
            if ($fluidContainers.length > 0) {
                count += $fluidContainers.length;
                $fluidRows.removeClass('container-fluid');
            }

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Form Structural Changes",
        description: "<p>Forms have undergone some major changes. Here's some of what needs to happen:</p><ul><li><code>form-search</code> is gone, replace with <code>form-inline</code></li><li>Remove <code>input-block-level</code> as inputs are 100% width by default</li><li>Replace <code>help-inline</code> with <code>help-block</code> as inline is no longer supported</li><li>Change <code>.control-group</code> to <code>.form-group</code></li><li>Add column widths to horizontal form labels and <code>.controls</code></li><li>Remove <code>.controls</code> class</li><li>Add <code>form-control</code> class to inputs and selects.</li><li>Wrap checkboxes and radios in an extra <code>&lt;div&gt;</code></li><li>Replace <code>.radio.inline</code> and <code>.checkbox.inline</code> with <code>-inline</code> instead</li></ul>",
        run: function (doc) {
            var count = 0;

            // Replace .form-search with .form-inline
            var searchForms = doc('.form-search').removeClass('form-search').addClass('form-inline');
            count += searchForms.length;

            // Remove input-block-level, it's now unncecessary
            var blockLevelInputs = doc('.input-block-level').removeClass('input-block-level');
            count += blockLevelInputs.length;

            // Replace .help-inline with .help-block
            var inlineHelps = doc(".help-inline").removeClass('help-inline').addClass('help-block');
            count += inlineHelps.length;

            var controlGroups = doc(".control-group").removeClass('control-group').addClass('form-group');
            count += controlGroups.length;

            var horizontalLabels = doc('.horizontal-form .control-label').addClass('col-lg-2');
            count += horizontalLabels.length;

            var horizontalControls = doc('.horizontal-form .controls').addClass('col-lg-2').removeClass('controls');
            count += horizontalControls.length;

            var formInputs = doc("input:not([type=checkbox], [type=radio])").addClass("form-control");
            count += formInputs.length;

            var checkboxLabels = doc("label.checkbox:not(.inline)").removeClass("checkbox").wrap("<div class='checkbox'></div>");
            count += checkboxLabels.length;

            var checkboxInlineLabels = doc(".checkbox.inline").removeClass("inline checkbox").addClass("checkbox-inline");
            count += checkboxInlineLabels.length;

            var radioLabels = doc("label.radio:not(.inline)").removeClass("radio").wrap("<div class='checkbox'></div>");
            count += checkboxLabels.length;

            var radioInlineLabels = doc(".radio.inline").removeClass("inline radio").addClass("radio-inline");
            count += radioInlineLabels.length;

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Navbar Structural Changes",
        description: "<p>Navbars have also gone under major structural change. Here's a summary of what we're doing:</p><ul><li>Replace <code>.navbar-search</code> with <code>.navbar-form</code></li><li>Replace <code>.navbar-inner</code> with <code>.container</code></li><li>Replace <code>.navbar .nav</code> with <code>.navbar-nav</code></li><li><code>.brand</code> is now <code>.navbar-brand</code></li><li><code>.navbar.pull-left</code> is now <code>.navbar-left</code></li><li><code>.navbar.pull-right</code> is now <code>.navbar-right</code></li><li><code>.nav-collapse</code> is now <code>.navbar-collapse</code></li><li><code>.navbar-brand, .navbar-toggle</code> are wrapped by <code>.navbar-header</code></li><li><code>.navbar:not(.navbar-inverse)</code> is now <code>.navbar.navbar-default</code></li></ul>",
        run: function (doc) {
            var count = 0;

            var navbarSearches = doc(".navbar-search").removeClass('navbar-search').addClass('navbar-form');
            count += navbarSearches.length;

            var navbarInners = doc(".navbar-inner").removeClass("navbar-inner").addClass("container");
            count += navbarInners.length;

            var navbarNavs = doc(".navbar .nav").addClass("navbar-nav");
            count += navbarNavs.length;

            var brands = doc(".navbar .brand").removeClass("brand").addClass("navbar-brand");
            count += brands.length;

            var rightNavs = doc(".navbar.pull-right").removeClass("pull-right").addClass("navbar-right");
            count += rightNavs.length;

            var leftNavs = doc(".navbar.pull-left").removeClass("pull-left").addClass("navbar-left");
            count += leftNavs.length;

            var collapsed = doc(".nav-collapse").removeClass("nav-collapse").addClass("navbar-collapse");
            count += collapsed.length;

            var wrappedByHeader = doc(".navbar-brand, .navbar-toggle");
            var wrapped;
            var header;
            var navbar;
            for (var i = wrappedByHeader.length - 1; i >= 0; i--) {
                wrapped = $(wrappedByHeader[i]);
                if (wrapped.parent().is(".navbar-header")) continue
                navbar = wrapped.parent();
                header = $("<div class='navbar-header'>");
                header.append(wrapped.parent().children(".navbar-brand, .navbar-toggle"));
                navbar.prepend(header);
                count += header.children().length;
            }
            ;

            var inverseNavs = doc(".navbar:not(.navbar-inverse)").addClass("navbar-default");
            count += inverseNavs.length;

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Changes to Button Color Classes",
        description: "Add <code>btn-default</code> to <code>btn</code> elements with no other color. Replace <code>btn-inverse</code> with <code>btn-default</code> since inverse has been removed from Bootstrap 3.",
        run: function (doc) {
            var $buttons = doc(".btn:not(.btn-primary,.btn-success,.btn-info,.btn-warning,.btn-danger)");
            var count = $buttons.length;

            // Remove btn-inverse, add btn-default if no existing color class is matched
            $buttons.removeClass('btn-inverse').addClass('btn-default');

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Dividers Removed from Breadcrumbs",
        description: "Bootstrap 3 uses CSS to add the dividers between breadcrumbs. Remove all <code>span.divider</code> elements inside breadcrumbs.",
        run: function (doc) {
            $dividers = doc(".breadcrumb .divider")
            var count = $dividers.length;

            $dividers.remove();
            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Helper Class Specificity",
        description: "Prefix <code>muted</code> with <code>text-</code> and prefix <code>unstyled</code> and <code>inline</code> with <code>list-</code> (on <code>ul</code> and <code>ol</code> elements only).",
        run: function (doc) {
            var count = 0;

            $muted = doc(".muted");
            $muted.removeClass('muted').addClass('text-muted');
            count += $muted.length;

            $unstyled = doc("ul.unstyled, ol.unstyled");
            $unstyled.removeClass('unstyled').addClass('list-unstyled');
            count += $unstyled.length;

            $inline = doc("ul.inline, ol.inline");
            $inline.removeClass('inline').addClass('list-inline');
            count += $inline.length;

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Hero Unit is now Jumbotron",
        description: "The component formerly known as a Hero Unit is now a Jumbotron, so swap <code>hero-unit</code> for <code>jumbotron</code>.",
        run: function (doc) {
            $jumbotrons = doc(".hero-unit");
            $jumbotrons.removeClass('hero-unit').addClass('jumbotron');
            var count = $jumbotrons.length;

            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Progress Bar Structural Changes",
        description: "The inner element class is now <code>progress-bar</code>, not <code>bar</code>. Additionally, the bar colors also have a <code>progress-</code> prefix.",
        run: function (doc) {
            $bars = doc(".progress .bar");
            $bars.removeClass('bar').addClass('progress-bar');

            var colors = ['success', 'info', 'warning', 'danger']
            $bars.each(function () {
                for (var i = 0; i < colors.length; i++) {
                    var $this = $(this)
                    var klass = "bar-" + colors[i]

                    if ($this.hasClass(klass)) {
                        $this.removeClass(klass).addClass("progress-" + klass);
                    }
                }
            });

            var count = $bars.length;
            return (count > 0) ? count + " Replaced" : false;
        }
    },

    {
        title: "Upgrade Responsive Classes",
        description: "Change responsive classes from <code>[visible|hidden]-[phone|tablet|desktop]</code> to <code>[visible|hidden]-[sm|md|lg]</code>",
        run: function (doc) {
            var prefixes = ['visible', 'hidden'];
            var devices = ['phone', 'tablet', 'desktop'];
            var sizes = ['sm', 'md', 'lg'];
            var count = 0;
            for (var i = 0; i < prefixes.length; i++) {
                for (var j = 0; j < devices.length; j++) {
                    var selector = prefixes[i] + '-' + devices[j];
                    var $targets = doc('.' + selector);
                    $targets.removeClass(selector).addClass(prefixes[i] + '-' + sizes[j])
                    count += $targets.length;
                }
            }
            return (count > 0) ? count + ' Replaced' : false;
        }
    },

    {
        title: "Upgrade Button, Pagination, and Well sizes.",
        description: "Change sizes from <code>[button|pagination|well]-[mini|small|large]</code> to <code>[button|pagination|well]-[xs|sm|lg]</code>",
        run: function (doc) {
            var types = ['btn', 'pagination', 'well'];
            var longSizes = ['mini', 'small', 'large'];
            var shortSizes = ['xs', 'sm', 'lg'];
            var count = 0;
            for (var i = 0; i < types.length; i++) {
                for (var j = 0; j < longSizes.length; j++) {
                    var selector = types[i] + '-' + longSizes[j];
                    var $targets = doc('.' + selector);
                    $targets.removeClass(selector)
                    $targets.addClass(types[i] + '-' + shortSizes[j]);
                    count += $targets.length;
                }
            }
            return (count > 0) ? count + ' Replaced' : false;
        }
    },

    {
        title: "Upgrade Alert Block Classes.",
        description: "<ul><li>Changes <code>.alert-block</code> to simply <code>.alert</code><br>Alerts without a modifier are defaulted to <code>.alert-warning</code>.</li><li><code>.alert-dismissable</code> added to all alerts that may be dismissed.</li></ul>",
        run: function (doc) {
            var count = 0;
            var alerts = doc(".alert-block").removeClass("alert-block").addClass("alert");
            count += alerts.length;

            var defaulted = doc(".alert:not(.alert-success, .alert-info, .alert-warning, .alert-danger)").addClass("alert-warning");
            count += alerts.length;

            var dismissed = doc(".alert:not(.alert-dismissable) .close").parent(".alert").addClass("alert-dismissable");
            count += dismissed.length;

            return (count > 0) ? count + ' Replaced' : false;
        }
    },

    {
        title: "Upgrade Label Classes.",
        description: "Changes <code>.label</code> to <code>.label.label-default</code>",
        run: function (doc) {
            var count = 0;
            var types = [];

            var defaults = doc(".label:not(.label-success, .label-warning, .label-important, .label-info, .label-inverse)");
            count += defaults.addClass("label-default");

            return (count > 0) ? count + ' Replaced' : false;
        }
    }
];

var Upgrader = {
    rules: RULESET,
    perform: function (input, report, outputFilePath) {
        var results = [];
        for (var i = 0; i < Upgrader.rules.length; i++) {
            var rule = Upgrader.rules[i];
            results.push(rule.title + ": " + rule.run(input));
        }

        var output = input.html();

        if (outputFilePath) {
            try {
                console.log(path.dirname(outputFilePath));
                mkdirp(path.dirname(outputFilePath), function (error) {
                    if (error) {
                        console.log(chalk.red(error));
                    } else {
                        fs.writeFileSync(outputFilePath, output, {encoding: 'utf8'});
                        console.log(chalk.green("Successfully wrote file: " + outputFilePath));
                    }
                });
            } catch (ex) {
                console.log(chalk.red("Error writing to file: " + outputFilePath));
            }
        }

        if (report) {
            return results;
        }
    }
}
