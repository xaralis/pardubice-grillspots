<template>
  <div class="wrapper" @keydown.esc="closeForm">
    <l-map ref="map" class="map" :zoom="zoom">
      <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
    </l-map>

    <div class="save-msg save-msg-error" v-if="areaMismatchDisplayed">
      Návrh umístění griloviště je možné podat pouze pro městský obvod Pardubice V (Dukla, Jesničánky, Višňovka a Dražkovice).
    </div>

    <div class="save-msg save-msg-success" v-if="saved">
      3. Děkujeme, <strong>váš podnět byl odeslán</strong>. Překontrolujeme ho a následně ho uveřejníme.
    </div>

    <div class="save-msg save-msg-error" v-if="errored">
      Omlouváme se, při ukládání vašeho podnětu došlo k chybě.
    </div>

    <div class="splash" v-show="splashDisplayed">
      <div class="splash-content">
        <h1 class="title">Požádejte městský obvod o vybudování griloviště u vašeho domu</h1>
        <p>Městský obvod Pardubice V pořádá veřejnou výzvu a občané jej mohou požádat o vybudování veřejného griloviště vedle jejich bytového domu.</p>
        <h2>Jak na to?</h2>
        <div class="splash-steps-wrap">
          <ol>
            <li>Zvolte na mapě, kde byste chtěli griloviště postavit.</li>
            <li>Vyplňte krátký formulář s doplňkovými informacemi.</li>
            <li>Váš podnět předáme vedení městského obvodu.</li>
          </ol>
        </div>
        <button type="submit" class="button" @click="splashDisplayed = false">Jdu na to</button>
      </div>
      <img src="./pirati-brand.svg" alt="Piráti" class="splash-brand" />
    </div>

    <div class="step-1-caption" v-show="!formDisplayed && !splashDisplayed && !saved"><h1>1. Vyberte místo na mapě</h1></div>

    <div ref="formWrap" class="form-wrap" v-show="formDisplayed">
      <a @click="closeForm" class="close"><img src="./close.svg"></a>

      <form class="form" @submit="checkForm" method="post">
        <h1 class="title">2. Doplňte pár nezbytností</h1>
        <p>Odesílání vašich návrhů je možné <strong>do konce ledna 2020</strong>. Abychom vám to usnadnili, můžete svůj návrh podat pomocí jednoduchého online formuláře.</p>
        <p>Při odesílání vašeho návrhu se prosím zamyslete, zda je na daném místě <strong>griloviště skutečně možné vybudovat</strong>. Ideální je rovněž váš nápad zkonzultovat se zástupci SVJ příslušných bytových domů.</p>

        <div class="form-control">
          <input type="text" placeholder="Vaše jméno" required v-model="myMarkerMetadata.firstName" autofocus />
          <input type="text" placeholder="Vaše příjmení" required v-model="myMarkerMetadata.lastName" />
        </div>
        <div class="form-control">
          <input type="email" placeholder="Váš email" required v-model="myMarkerMetadata.email" />
        </div>
        <div class="form-control">
          <input type="phone" placeholder="Váš telefon (nepovinné)" v-model="myMarkerMetadata.phone" />
        </div>
        <div class="form-control">
          <input type="text" placeholder="Adresa domu, za který žádáte (např. Josefa Ressla 123)" required v-model="myMarkerMetadata.house" />
        </div>
        <div class="form-control">
          <textarea name="note" cols="30" rows="10" placeholder="Poznámka (nepovinné)" v-model="myMarkerMetadata.note"></textarea>
        </div>

        <button type="submit" class="button">Odeslat</button>
        <p><strong>Odesláním formuláře souhlasíte s tím, že Piráti odešlou vaše kontaktní údaje MO Pardubice V. Vaše údaje poté smažeme a nebudeme používat k jiným účelům.</strong></p>
        <p>
          <strong>Poznámka:</strong> Odesláním vašeho podnětu nevzniká žádná garance, že na daném místě griloviště skutečně vznikne. Vaše podněty pouze sesbíráme a předáme vedení městského obvodu, abychom pro vás celou proceduru co nejvíce usnadnili. Konečné rozhodnutí ovšem bude na vedení obvodu, který vás bude po uplynutí lhůty pro navrhování kontaktovat.
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import { LMap, LTileLayer } from 'vue2-leaflet'
import 'leaflet.markercluster'
import Parse from 'parse'

L.Map.prototype.panToOffset = function(latlng, offset, options) {
    var x = this.latLngToContainerPoint(latlng).x - offset[0]
    var y = this.latLngToContainerPoint(latlng).y - offset[1]
    var point = this.containerPointToLatLng([x, y])
    return this.setView(point, this._zoom, { pan: options })
}

Parse.serverURL = process.env.VUE_APP_PARSE_BACKEND;
Parse.initialize(process.env.VUE_APP_PARSE_APP_ID, process.env.VUE_APP_PARSE_APP_KEY);

const Spot = Parse.Object.extend('Spot');
const SpotProfile = Parse.Object.extend('SpotPublicProfile');

const palette = {
  black: {
    color: '#000000',
    icon: require('./grill-black.svg'),
  },
  yellow: {
    color: '#ffcd00',
    icon: require('./grill-yellow.svg'),
  },
};

function isPointInPoly(latlng, poly) {
    var inside = false;
    var x = latlng.lat, y = latlng.lng;
    for (var ii=0;ii<poly.getLatLngs().length;ii++){
        var polyPoints = poly.getLatLngs()[ii];
        for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            var xi = polyPoints[i].lat, yi = polyPoints[i].lng;
            var xj = polyPoints[j].lat, yj = polyPoints[j].lng;

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
    }

    return inside;
}

Object.keys(palette).forEach(key => {
  palette[key].marker = new L.Icon({
    iconUrl: palette[key].icon,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    // popupAnchor: [25, 16],
  });
});

// Masking API
// credits: https://github.com/turban/Leaflet.Mask
L.Mask = L.Polygon.extend({
	options: {
    stroke: true,
    weight: 1,
		color: '#000',
		fillOpacity: 0.45,
		clickable: false,

		outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
	},

	initialize: function (latLngs, options) {
      let outerBoundsLatLngs = [
        this.options.outerBounds.getSouthWest(),
        this.options.outerBounds.getNorthWest(),
        this.options.outerBounds.getNorthEast(),
        this.options.outerBounds.getSouthEast()
      ];
      L.Polygon.prototype.initialize.call(this, [outerBoundsLatLngs, latLngs], options);
	},

});

L.mask = function (latLngs, options) {
	return new L.Mask(latLngs, options);
};

export default {
  props: {
    /**
     * Access token for mapbox.
     */
    accessToken: {
      type: String,
      required: true,
    },
  },
  components: {
    LMap,
    LTileLayer,
  },
  data () {
    return {
      // Future map reference
      map: null,
      districtMask: null,
      myMarker: null,
      myMarkerMetadata: {
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        note: null,
      },
      splashDisplayed: true,
      formDisplayed: false,
      saved: false,
      errored: false,
      areaMismatchDisplayed: false,
      zoom: 15,
      url:`https://api.mapbox.com/styles/v1/xaralis/ck4oblwty0fgk1fjzxmqow2r5/tiles/256/{z}/{x}/{y}@2x?access_token=${this.accessToken}`,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    }
  },

  methods: {
    /**
     * Handle map click event
     */
    onMapClick(evt) {
      this.errored = false;

      const isInArea = !isPointInPoly(evt.latlng, this.districtMask);

      if (isInArea && !this.saved) {
        this.areaMismatchDisplayed = false;

        if (this.myMarker) {
          this.myMarker.removeFrom(this.map);
        }

        this.myMarker = new L.marker(evt.latlng, { icon: palette.yellow.marker }).addTo(this.map).bindTooltip('Vaše nové griloviště').on('click', this.onMarkerClick);
        this.showForm();
        this.panToMyMarker();
      } else {
        this.areaMismatchDisplayed = true;
        this.closeForm();
      }
    },

    /**
     * Handle click on my or some other marker.
     */
    onMarkerClick(evt) {
      const currentMarker = evt.target;
      currentMarker.openTooltip();

      if (currentMarker === this.myMarker) {
        this.areaMismatchDisplayed = false;
        if (!this.saved) {
          this.showForm();
        }
        this.panToMyMarker();
      } else {
        this.closeForm();
        this.map.panTo(currentMarker.getLatLng());
      }
    },

    panToMyMarker() {
      this.$nextTick(() => {
        let xOffset = 0;
        let yOffset = 0;

        // On large screens, point is visible directly.
        if (this.$el.getBoundingClientRect().width >= 768) {
          // form takes up 60% the elem width, center in the place that is left
          xOffset = this.$refs.formWrap.getBoundingClientRect().width * -0.5;
        } else {
          yOffset = this.$refs.formWrap.getBoundingClientRect().height * -0.5;
        }

        const latLng = this.myMarker.getLatLng();
        this.map.panToOffset(latLng, [xOffset, yOffset]);
      });
    },

    /**
     * Append loaded markers from the BE to the map
     */
    onSpotsLoaded(results) {
      results.forEach(r => {
        const marker = new L.marker(L.latLng(r.attributes.latlng.latitude, r.attributes.latlng.longitude), { icon: palette.black.marker });
        marker.$spot = r;
        marker.bindTooltip(`Návrh od ${marker.$spot.attributes.posted_by} z ${marker.$spot.createdAt.toLocaleDateString()}`);
        marker.addTo(this.map).on('click', this.onMarkerClick);
      });
    },

    onDistrictBoundaryLoaded(results) {
      // transform geojson coordinates into an array of L.LatLng
      const latLngs = results.geometry.coordinates[0].map(coords => new L.LatLng(coords[1], coords[0]));
      this.districtMask = L.mask(latLngs);
      this.districtMask.addTo(this.map);
    },

    showForm() {
      this.formDisplayed = true;
    },

    closeForm() {
      this.formDisplayed = false;
    },

    /**
     * Handle form submit
     */
    async checkForm(event) {
      event.preventDefault();

      if (this.myMarkerMetadata.firstName && this.myMarkerMetadata.lastName && this.myMarkerMetadata.email && this.myMarkerMetadata.house && this.myMarker) {
        const newSpot = new Spot();
        const newSpotProfile = new SpotProfile();
        const spotProfileACL = new Parse.ACL();
        const spotACL = new Parse.ACL();
        const markerLatLng = this.myMarker.getLatLng();


        spotProfileACL.setPublicReadAccess(true);
        spotProfileACL.setPublicWriteAccess(false);
        newSpotProfile.setACL(spotProfileACL);
        newSpotProfile.set('posted_by', `${this.myMarkerMetadata.firstName} ${this.myMarkerMetadata.lastName.substring(0, 1)}.`);
        newSpotProfile.set('latlng', new Parse.GeoPoint({
          latitude: markerLatLng.lat,
          longitude: markerLatLng.lng,
        }));

        spotACL.setPublicReadAccess(false);
        spotACL.setPublicWriteAccess(false);
        newSpot.setACL(spotACL);
        newSpot.set('first_name', this.myMarkerMetadata.firstName);
        newSpot.set('last_name', this.myMarkerMetadata.lastName);
        newSpot.set('phone', this.myMarkerMetadata.phone);
        newSpot.set('email', this.myMarkerMetadata.email);
        newSpot.set('house', this.myMarkerMetadata.house);
        newSpot.set('note', this.myMarkerMetadata.note);

        newSpotProfile.set('spot', newSpot);

        try {
          await newSpotProfile.save();

          this.saved = true;
          this.closeForm();

          this.myMarker.$spot = newSpot;
          // Add click evt to my current marker
          this.myMarker.on('click', this.onMarkerClick);
        } catch (err) {
          this.errored = true;
          /* eslint-disable-next-line */
          console.error('Error while creating Spot: ', err);
        }
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
      // MO V center
      this.map.panTo(new L.LatLng(50.020904, 15.771403));

      // Load current dataset from parse
      new Parse.Query(SpotProfile).equalTo('published', true).find().then(this.onSpotsLoaded);

      fetch(require('../assets/pardubice-mo-v.geojson')).then(async response => {
        if (response.status === 200) {
          this.onDistrictBoundaryLoaded(await response.json());
        }
      });

      // Map click handler
      this.map.on('click', this.onMapClick);
    });
  },
}
</script>

<style lang="scss">
@import "~leaflet/dist/leaflet.css";
@import "~leaflet.markercluster/dist/MarkerCluster.css";

.wrapper, .map {
  height: 100%;
  min-height: 100vh;
}

.wrapper {
  position: relative;
}

.map {
  z-index: 1;
}

.title {
  margin-top: 0;
}

.splash {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  padding: 2rem;
  z-index: 2;
  background: rgba(0, 0, 0, .8);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  overflow-y: scroll;

  @media (min-width: 768px) {
    font-size: 1.5rem;
    padding: 6rem 2rem;
  }

  &-content {
    max-width: 30em;
  }

  &-steps-wrap {
    display: flex;
  }

  &-brand {
    max-width: 6rem;
    margin-top: 2rem;

    @media (min-width: 768px) {
      max-width: 8rem;
    }
  }

  h2 {
    margin-top: 3rem;
  }

  ol {
    text-align: left;
    margin: auto;
    padding-left: 1rem;
    margin-bottom: 3rem;
  }
}

.step-1-caption {
  top: 2rem;
  right: 2rem;
  position: absolute;
  z-index: 2;

  h1 {
    margin: 0;
    color: #fff;
    text-shadow: 0 0 .3rem #000;
  }
}

.close {
  display: block;
  float: right;
  width: 1.5rem;
  height: 1.5rem;
  margin: -2rem -1.5rem 0 0;
  cursor: pointer;

  @media (min-width: 768px) {
    margin-top: -1rem;
  }
}

.form-wrap {
  position: absolute;
  top: 25%;
  right: 0;
  height: 75%;
  width: 100%;
  z-index: 2;
  background: rgba(0, 0, 0, .8);
  color: #fff;
  text-align: left;
  overflow-y: scroll;
  padding: 3rem 2rem;

  @media (min-width: 768px) {
    padding: 2rem 3rem;
    top: 0;
    right: 0;
    height: 100%;
    width: 70%;
    max-width: 42rem;
  }
}

.form {
  width: 100%;

  .form-control {
    width: 100%;

    @media (min-width: 512px) {
      display: flex;
    }

    &:first-of-type {
      margin-top: 2rem;
    }
  }

  input, textarea {
    margin-bottom: 1rem;
  }

  input + input {
    @media (min-width: 512px) {
      margin-left: 1rem;
    }
  }
}

.save-msg {
  width: 100%;
  position: absolute;
  bottom: 0;
  z-index: 2;
  padding: 1rem 1rem;
  color: #fff;
  font-size: 1rem;

  @media (min-width: 512px) {
    font-size: 1.5rem;
    padding: 2rem 3rem;
  }

  &-success {
    background: #000;
  }

  &-error {
    background: rgb(216, 18, 18);
  }
}
</style>
