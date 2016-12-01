const margin = {
    top: 40,
    bottom: 10,
    left: 20,
    right: 20
};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Creates sources <svg> element and inner g (for margins)
const svg = d3.select('body').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

/////////////////////////

var data = null; //will be set after they are loaded
const uiOptions = {
    xattr: 'mpg',
    yattr: 'hp',
    barattr: 'mpg', //attribute shown in the bar chart
    selection: null //currently selected object
};
//create scatterplot instance
const scatterPlot = createScatterPlot('#scatterPlot');
//create bar chart instance
const barChart = createBarChart('#barChart');

d3.csv('./data/mtcars.csv', (error, _loaded) => {
    //data wrangling of the dataset
    const columns = Object.keys(_loaded[0]);
    const numericColumns = columns.filter((d) => d !== 'car');

    _loaded.forEach((row) => {
        //convert all columns except 'car' to number
        numericColumns.forEach((col) => row[col] = parseFloat(row[col]));
    });

    data = _loaded;

    initUI(numericColumns);
    updateCharts();
});

function updateCharts() {
    //update the scatterplot
    scatterPlot(data, uiOptions.xattr, uiOptions.yattr, uiOptions.selection);
    //update the barchart
    barChart(data, 'car', uiOptions.barattr, uiOptions.selection);
}

/**
 * initializes the user interface and triggers updates during a change
 * @param columns the possible columns to choose
 */
function initUI(columns) {
    //create the options for a select element
    const createOptions = (selector, defaultValue) => {
        const select = d3.select(selector);
        //create options
        const options = select.selectAll('option').data(columns);
        const options_enter = options.enter().append('option');
        //String ~ function(d) { return d; }
        options.merge(options_enter).attr('value', String).text(String);
        options.exit().remove();
        //set the default selection
        select.property('selectedIndex', columns.indexOf(defaultValue));
    }
    createOptions('#xattr', uiOptions.xattr);
    createOptions('#yattr', uiOptions.yattr);
    createOptions('#barattr', uiOptions.barattr);

    //when a change happens update the chart
    d3.selectAll('#xattr, #yattr, #barattr').on('change', function() {
        const id = this.id;
        const value = columns[this.selectedIndex];
        if (id === 'xattr') {
            uiOptions.xattr = value;
        } else if (id === 'yattr') {
            uiOptions.yattr = value;
        } else if (id === 'barattr') {
            uiOptions.barattr = value;
        }

        updateCharts();
    });
}

/**
 * creates a scatterplot instance
 * @param baseSelector css selector for the base element where this plot should be appended
 * @return update method to update the plot
 */
function createScatterPlot(baseSelector) {
    const dims = {
        margin: 40,
        width: 300,
        height: 300
    };
    const svg = d3.select(baseSelector).append('svg')
        .attr('width', dims.width + dims.margin * 2)
        .attr('height', dims.height + dims.margin * 2);
    //create a root shifted element
    const root = svg.append('g').attr('transform', `translate(${dims.margin},${dims.margin})`);

    //create basic svg structure for the chart
    root.append('g').attr('class', 'axis xaxis').attr('transform', `translate(0,${dims.height})`);
    root.append('g').attr('class', 'axis yaxis');
    root.append('g').attr('class', 'chart');

    const xscale = d3.scaleLinear().range([0, dims.width]);
    const yscale = d3.scaleLinear().range([dims.height, 0]);

    const xaxis = d3.axisBottom().scale(xscale);
    const yaxis = d3.axisLeft().scale(yscale);

    /**
     * updates the scatterplot
     * @param data the dataset to visualize
     * @param xAttr the xAttr to use
     * @param yAttr the yAttr to use
     * @param selection the currently selected data object
     */
    function update(data, xAttr, yAttr, selection) {
        //update scales with the min/max of the selected attribute
        xscale.domain(d3.extent(data, (d) => d[xAttr]));
        yscale.domain(d3.extent(data, (d) => d[yAttr]));

        //update the chart
        const circles = root.select('g.chart').selectAll('circle').data(data);
        //enter
        const circles_enter = circles.enter().append('circle')
            .attr('r', 5)
            .on('mouseenter', (d) => {
                //when the mouse enters/hovers the circle set the current element as the selected one an trigger an update
                uiOptions.selection = d;
                updateCharts();
            }).on('mouseleave', (d) => {
                uiOptions.selection = null;
                updateCharts();
            });
        circles_enter.append('title'); //tooltip
        //update
        const circles_update = circles.merge(circles_enter);
        circles_update.transition().duration(1000)
          .attr('cx', (d) => xscale(d[xAttr]))
          .attr('cy', (d) => yscale(d[yAttr]));
        //add a class for the currently selected item
        circles_update.classed('selected', (d) => d === selection);
        //create tooltip
        circles_update.select('title').text((d) => `${d[xAttr]} / ${d[yAttr]}`);

        //exit
        circles.exit().remove();

        //update axis
        root.select('g.xaxis').call(xaxis);
        root.select('g.yaxis').call(yaxis);
    }

    return update;
}

/**
 * creates a barchart instance
 * @param baseSelector css selector for the base element where this plot should be appended
 * @return update method to update the plot
 */
function createBarChart(baseSelector) {
    const dims = {
        leftMargin: 200,
        bottomMargin: 30,
        width: 300,
        height: 700
    };
    const svg = d3.select(baseSelector).append('svg')
        .attr('width', dims.width + dims.leftMargin)
        .attr('height', dims.height + dims.bottomMargin);
    //create a root shifted element
    const root = svg.append('g').attr('transform', `translate(${dims.leftMargin},0)`);

    //create basic svg structure for the chart
    root.append('g').attr('class', 'axis xaxis').attr('transform', `translate(0,${dims.height})`);
    root.append('g').attr('class', 'axis yaxis');
    root.append('g').attr('class', 'chart');

    const xscale = d3.scaleLinear().range([0, dims.width]);
    const yscale = d3.scaleBand().rangeRound([0, dims.height]).paddingInner(0.1);
    const xaxis = d3.axisBottom().scale(xscale);
    const yaxis = d3.axisLeft().scale(yscale);
    /**
     * updates the scatterplot
     * @param data the dataset to visualize
     * @param nameAttr the name attribute to use
     * @param yAttr the yAttr to use
     * @param selection the currently selected data object
     */
    function update(data, nameAttr, xAttr, selection) {
        //sort by the attribute
        data = data.slice().sort((a, b) => d3.descending(a[xAttr], b[xAttr]));

        //update scales
        xscale.domain(d3.extent(data, (d) => d[xAttr]));
        yscale.domain(data.map((d) => d[nameAttr]));

        //update the chart
        //use a key function to ensure that the same DOM element will be bound to the same object row, required for transitions
        const bars = root.select('g.chart').selectAll('rect.bar').data(data, (d) => d[nameAttr]);
        //enter
        const bars_enter = bars.enter().append('rect')
            .classed('bar', true)
            .attr('x', 0)
            .on('mouseenter', (d) => {
                  uiOptions.selection = d;
                  updateCharts();
            }).on('mouseleave', (d) => {
                uiOptions.selection = null;
                updateCharts();
            });
        bars_enter.append('title'); //tooltip
        //update
        const bars_update = bars.merge(bars_enter);
        bars_update.transition().duration(1000)
          .attr('width', (d) => xscale(d[xAttr]))
          .attr('y', (d) => yscale(d[nameAttr]))
          .attr('height', yscale.bandwidth());

        bars_update.classed('selected', (d) => d === selection);

        bars_update.select('title').text((d) => `${d[nameAttr]}: ${d[xAttr]}`);
        //exit
        bars.exit().remove();

        //update axis
        root.select('g.xaxis').transition().duration(1000).call(xaxis);
        root.select('g.yaxis').transition().duration(1000).call(yaxis);
    }

    return update;
}
