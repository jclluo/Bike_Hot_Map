<script>
    //First step: creating  the map
	mapboxgl.accessToken = "pk.eyJ1IjoiYzZsdW8iLCJhIjoiY2x3NGpsMWJ2MTUxNDJtcHZiaDlwenl0aCJ9.E1SLnII70oVnQcPYAizY_w";
	const map = new mapboxgl.Map({
		container: "map",
		style: "mapbox://styles/mapbox/dark-v11", 
		center: [-71.0942, 42.3601], 
		zoom: 13,
		minZoom: 12,
		maxZoom: 15,
	});
    // Second step: a new map layer to plot
    map.on("load", () => {
		map.addSource("boston_route", {
			type: "geojson",
			data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?outSR=%7B%22latestWkid%22%3A3857%2C%22wkid%22%3A102100%7D",
		});
		map.addLayer({
			id: "boston_route",
			type: "line",
			source: "boston_route",
			paint: {
				"line-color": "#BEE5B0",
				"line-width": 2,
			},
		});
	});
    map.on("load", () => {
		map.addSource("cambrige_route", {
			type: "geojson",
			data: "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson",
		});
		map.addLayer({
			id: "cambrige_route",
			type: "line",
			source: "cambrige_route",
			paint: {
				"line-color": "#BEE5B0",
				"line-width": 2,
			},
		});
	});
    
    // recalculate and update the station marker positions whenever the map changes
    map.on("viewreset", position_station_markers);
	map.on("move", position_station_markers);
	map.on("moveend", position_station_markers);

    const colorScale = d3.scaleLinear()
    .domain([0, 0.5, 1]) 
    .range(["red", "white", "green"]);


    //function of drawing the circles
    function create_station_markers(station_data) {
    station_markers = marker_container
        .selectAll("circle")
        .data(station_data)
        .enter()
        .append("circle")
        .attr("r", 5)
        .style("fill", function(d) {
            return calculateColor(d["station_id"]);
        })
        .attr("stroke", "#808080")
        .attr("stroke-width", 1)
        .attr("fill-opacity", 0.8)
        .attr("name", function (d) {
            return d["name"];
        });
    position_station_markers();
}

    //circle positions
    function position_station_markers() {
		station_markers
			.attr("cx", function (d) {
				return project(d).x;
			})
			.attr("cy", function (d) {
				return project(d).y;
			});
	}
	function project(d) {
		return map.project(new mapboxgl.LngLat(+d.lon, +d.lat));
	}

    function update_station_markers() {
    station_markers
        .transition()
        .duration(1000)
        .attr("r", function (d) {
            let trafficVolume = arrivals[d["station_id"]] + departures[d["station_id"]];
            return scaleRadiusTrafficVolume(trafficVolume);
        })
        .style("fill", function(d) {
            return calculateColor(d["station_id"]);
        });
}

    function calculateColor(station_id) {
        let totalTraffic = arrivals[station_id] + departures[station_id];
        let arrivalRatio = totalTraffic > 0 ? arrivals[station_id] / totalTraffic : 0;
        return colorScale(arrivalRatio);
    }

    

	function scaleRadiusTrafficVolume(traffic, maxTraffic = 500) {
		const scaleRadius = d3.scaleSqrt()
			.domain([0, 1, maxTraffic])
			.range([0, 3, 20]);
		return scaleRadius(traffic);
	}

    function tallyTrips(trips_data) {
		arrivals.fill(0);
		departures.fill(0);
		for (let i = 0; i < trips_data.length; ++i) {
			arrivals[trips_data[i]["end station id"]]++;
			departures[trips_data[i]["start station id"]]++;
		}
	}

    function filterTrips(sliderTime) {
		let value = sliderTimeScale(sliderTime);
		let filterWindowHours = 0;
		let filterWindowMinutes = 120;
		let filterHours = value.getHours();
		let filterMinutes = value.getMinutes();
		return trip_data.filter(function (trip) {
			let tripStartTime = new Date(trip["starttime"]);
			let tripEndTime = new Date(trip["stoptime"]);
			let filterStartTime = new Date(tripStartTime.getTime());
			let filterEndTime = new Date(tripEndTime.getTime());
			filterStartTime.setHours(filterHours - filterWindowHours / 2);
			filterEndTime.setHours(filterHours + filterWindowHours / 2);
			filterStartTime.setMinutes(filterMinutes - filterWindowMinutes / 2);
			filterEndTime.setMinutes(filterMinutes + filterWindowMinutes / 2);
			return (
				(tripStartTime >= filterStartTime &&
					tripStartTime <= filterEndTime) ||
				(tripEndTime >= filterStartTime && tripEndTime <= filterEndTime)
			);
		});
	}
	const sliderTimeScale = d3
		.scaleTime()
		.domain([0, 1440])
		.range([new Date("2015-12-01 00:00"), new Date("2015-12-02 00:00")]);


    //stationary points
    let stationsFile = "https://raw.githubusercontent.com/dsc-courses/dsc106-wi24/gh-pages/resources/data/lab6_station_info.json";
	let tripFile = "https://raw.githubusercontent.com/dsc-courses/dsc106-wi24/gh-pages/resources/data/lab6_bluebikes_2020.csv";
    let station_data = [];
	let station_markers;
    let trip_data = [];
    let arrivals = new Array(600).fill(0);
	let departures = new Array(600).fill(0);
    let filtered_trip_data = [];
    let slider_time = 720;
	let slider_label = "";




	fetch(stationsFile)
		.then((response) => response.json())
		.then((d) => (station_data = d.data.stations))
        .then((d) => create_station_markers(d));

    d3.csv(tripFile).then(function (d) {
		trip_data = d;
		console.log(trip_data);
	});

    $: {
	if (trip_data.length !== 0) {
			filtered_trip_data = filterTrips(slider_time);
			tallyTrips(filtered_trip_data);
			update_station_markers();
		}
	slider_label = sliderTimeScale(slider_time).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}


    //drawing the stationary poitns
    const marker_container = d3
		.select(map.getCanvasContainer() )
		.append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.style("position", "absolute")
		.style("z-index", 2);

    


</script>
<main>
    <div class="overlay">
		<label>{slider_label}</label>
		<input
			id="slider"
			type="range"
			min="1"
			max="1440"
			bind:value={slider_time}
		/>
	</div>

</main>
