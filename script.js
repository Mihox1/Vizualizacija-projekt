// Dimensions for the charts
const mapWidth = 960;
const mapHeight = 700;
const barWidth = 500;
const barHeight = 400;
const barMargin = { top: 20, right: 30, bottom: 100, left: 40 };

// Define projections and paths for the map
const projection = d3.geoMercator()
  .scale(130)
  .translate([mapWidth / 2, mapHeight / 1.5]);

const path = d3.geoPath()
  .projection(projection);

// Create SVG elements for each chart
const svgMap = d3.select("#world-map")
  .attr("width", mapWidth)
  .attr("height", mapHeight);

const svgBar = d3.select("#bar-chart")
  .attr("width", barWidth)
  .attr("height", barHeight);

// Function to generate bar chart for frequency
const barChart = svgBar.append("g")
  .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

// Load and display the World map
d3.json("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json")
  .then(function(world) {
    svgMap.selectAll("path")
      .data(world.features)
      .enter().append("path")
      .attr("d", path)
      .style("fill", "#ccc")
      .style("stroke", "#fff")
      .style("stroke-width", 0.5)
      .on('click', function(event, d) {
        clicked(event, d);
      });
  });


const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on('zoom', zoomed);

svgMap.call(zoom);


function clicked(event, country) {
  const [[x0, y0], [x1, y1]] = path.bounds(country);
  event.stopPropagation();

  svgMap.selectAll("path")
    .style("fill", "#ccc");

  d3.select(event.target)
    .style("fill", "red");

  svgMap.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(mapWidth / 2, mapHeight / 2)
      .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / mapWidth, (y1 - y0) / mapHeight)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
  );

  // Load CSV data for passwords
  d3.csv("top_200_password_2020_by_country.csv").then(function(data) {
    // Filter data for the clicked country
    const filteredData = data.filter(d => d.country === country.properties.ADMIN);
    // Sort filtered data by User_count (descending) and limit to top 5
    const topPasswords = filteredData.sort((a, b) => b.User_count - a.User_count).slice(0, 5);
    
    // Update bar chart data for frequency
    const barData = topPasswords.map(d => ({
      category: d.Password,
      value: +d.User_count
    }));

    // Update bar chart
    updateBarChart(barData, country.properties.ADMIN);

    // Update time to crack display
    const passwordInput = document.getElementById("password-input");
    const password = passwordInput.value.trim(); // Get trimmed input value
    updateTimeToCrack(password); // Call function to update time to crack display
  });
}


function updateBarChart(data, countryName) {
  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.category))
    .range(d3.schemeCategory10);

  const x = d3.scaleBand()
    .domain(data.map(d => d.category))
    .range([barMargin.left, barWidth - barMargin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .nice()
    .range([barHeight - barMargin.bottom, barMargin.top]);

  barChart.selectAll(".bar").remove();

  barChart.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.category))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => barHeight - barMargin.bottom - y(d.value))
    .attr("fill", d => colorScale(d.category));

  barChart.selectAll("g.x-axis").remove();
  barChart.selectAll("g.y-axis").remove();

  barChart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${barHeight - barMargin.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  barChart.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${barMargin.left},0)`)
    .call(d3.axisLeft(y).ticks(null, "s"))
    .call(g => g.select(".domain").remove());

  barChart.selectAll("text.axis-label").remove();

  barChart.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${barWidth / 2},${barHeight})`)
    .style("text-anchor", "middle")


  svgBar.selectAll(".chart-title").remove();
  svgBar.append("text")
    .attr("class", "chart-title")
    .attr("x", barWidth / 2)
    .attr("y", barMargin.top / 2)
    .style("text-anchor", "middle")
    .text(countryName);


  const titleHeight = svgBar.select(".chart-title").node().getBBox().height;
  const titleOffset = titleHeight > barHeight / 2 ? 10 : barHeight / 2 + titleHeight;
  svgBar.select(".chart-title")
    .attr("y", titleOffset);
}

function zoomed(event) {
  const { transform } = event;
  svgMap.selectAll('path')
    .attr('transform', transform)
    .attr('stroke-width', 1 / transform.k);
}


function colorCountriesByPassword(password) {
 
  d3.csv("top_200_password_2020_by_country.csv").then(function(data) {

    const countriesWithPassword = data.filter(d => d.Password === password);

    const countries = countriesWithPassword.map(d => d.country);


    svgMap.selectAll("path")
      .style("fill", d => countries.includes(d.properties.ADMIN) ? "green" : "#ccc");


    updateTimeToCrack(password);
  });
}


function updateTimeToCrack(password) {
  d3.csv("top_200_password_2020_by_country.csv").then(function(data) {
    const passwordData = data.find(d => d.Password === password);
    console.log(passwordData);
    if (passwordData) {
      const timeToCrackInSeconds = passwordData.Time_to_crack_in_seconds;
      const timeToCrackDisplay = document.getElementById("time-to-crack");
      console.log(timeToCrackDisplay);
      timeToCrackDisplay.textContent = `Time to Crack: ${timeToCrackInSeconds} seconds`;
    } else {
      const timeToCrackDisplay = document.getElementById("time-to-crack");
      timeToCrackDisplay.textContent = `Time to Crack: Not available`;
    }
  });
}




const passwordInput = document.getElementById("password-input");
passwordInput.addEventListener("input", function() {
  const password = this.value.trim(); 
  updatePasswordStrength(password);
  colorCountriesByPassword(password); 
});
function updatePasswordStrength(password) {
  const strengthDisplay = document.getElementById("password-strength");
  const strength = calculatePasswordStrength(password); 
  strengthDisplay.textContent = `Strength: ${strength}`;
}

function calculatePasswordStrength(password) {
  let strength = "Weak";
  if (password.length > 3) strength = "Medium";
  if (password.length > 5 && /[A-Z]/.test(password) && /[0-9]/.test(password)) strength = "Strong";
  if (password.length > 7 && /[^A-Za-z0-9]/.test(password)) strength = "Very Strong";
  return strength;
}

  

// Initial load for default state
const defaultCountry = "Germany"; // Replace with your desired default country
clicked(null, { properties: { ADMIN: defaultCountry } });

// Initial load for default password
const defaultPassword = "password"; // Replace with your desired default password
updateTimeToCrack(defaultPassword);