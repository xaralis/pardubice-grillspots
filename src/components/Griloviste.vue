<template>
  <div class="wrapper">
    <l-map ref="map" class="map" :zoom="zoom">
      <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
    </l-map>

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
            <li>Obvod vás bude kontaktovat.</li>
          </ol>
        </div>
        <button type="submit" class="button" @click="splashDisplayed = false">Jdu na to</button>
      </div>
    </div>

    <div class="step-1-caption" v-show="!formDisplayed && !splashDisplayed && !saved"><h1>1. Vyberte místo na mapě</h1></div>

    <div ref="formWrap" class="form-wrap" v-show="formDisplayed">
      <form class="form" @submit="checkForm" method="post">
        <h1 class="title">2. Doplňte pár nezbytností</h1>
        <p>Odesílání vašich návrhů je možné <strong>do konce ledna 2020</strong>. Abychom vám to usnadnili, můžete svůj návrh podat pomocí jednoduchého online formuláře.</p>
        <p>Při odesílání vašeho návrhu se prosím zamyslete, zda je na daném místě griloviště skutečně možné vybudovat. Ideální je rovněž váš nápad zkonzultovat s SVJ příslušných bytových domů.</p>

        <div class="form-control">
          <input type="text" placeholder="Vaše jméno" required v-model="myMarkerMetadata.name" autofocus />
        </div>
        <div class="form-control">
          <input type="email" placeholder="Váš email" required v-model="myMarkerMetadata.email" />
        </div>
        <div class="form-control">
          <input type="phone" placeholder="Váš telefon" required v-model="myMarkerMetadata.phone" />
        </div>
        <div class="form-control">
          <textarea name="svj" cols="30" rows="10" placeholder="Poznámka" v-model="myMarkerMetadata.note"></textarea>
        </div>

        <button type="submit" class="button">Odeslat</button>
        <p>
          <strong>Poznámka:</strong> Odesláním vašeho podnětu nevzniká žádná garance, že na daném místě griloviště skutečně vznikne. Piráti podněty pouze sesbírají a ve vhodnou chvíli je předají vedení městského obvodu, abychom pro vás celou proceduru co nejvíce usnadnili. Konečné rozhodnutí ovšem bude na vedení obvodu, který vás bude po uplynutí lhůty pro navrhování kontaktovat.
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
      myMarker: null,
      myMarkerMetadata: {
        name: null,
        email: null,
        phone: null,
        note: null,
      },
      currentMarker: null,
      splashDisplayed: true,
      formDisplayed: false,
      saved: false,
      errored: false,
      zoom: 15,
      allSpots: [],
      url:`https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=${this.accessToken}`,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    }
  },

  methods: {
    /**
     * Handle map click event
     */
    onMapClick(evt) {
      this.errored = false;

      if (this.myMarker && !this.saved) {
        this.myMarker.removeFrom(this.map);
      }

      if (!this.saved) {
        this.myMarker = new L.marker(evt.latlng).addTo(this.map).bindTooltip('Vaše nové místo').on('click', this.onMarkerClick);
        this.formDisplayed = true;
        this.panToMyMarker();
      }
    },

    /**
     * Handle click on my or some other marker.
     */
    onMarkerClick(evt) {
      this.currentMarker = evt.target;
      this.currentMarker.openTooltip();

      if (this.currentMarker === this.myMarker) {
        this.formDisplayed = true;
        this.panToMyMarker();
      } else {
        this.formDisplayed = false;
        this.map.panTo(this.currentMarker.getLatLng());
      }
    },

    panToMyMarker() {
      this.$nextTick(() => {
        // form takes up 60% the elem width, center in the place that is left
        const xOffset = this.$refs.formWrap.getBoundingClientRect().width * -0.5;
        const latLng = this.myMarker.getLatLng();
        this.map.panToOffset(latLng, [xOffset, 0]);
      });
    },

    /**
     * Append loaded markers from the BE to the map
     */
    onSpotsLoaded(results) {
      results.forEach(r => {
        const marker = new L.marker(L.latLng(r.attributes.latlng.latitude, r.attributes.latlng.longitude));
        marker.$spot = r;
        marker.bindTooltip(`Přidáno ${marker.$spot.createdAt.toLocaleDateString()}`);
        marker.addTo(this.map).on('click', this.onMarkerClick);
      });

      this.allSpots = results;
    },

    /**
     * Handle form submit
     */
    async checkForm(event) {
      event.preventDefault();

      if (this.myMarkerMetadata.name && this.myMarkerMetadata.email && this.myMarkerMetadata.phone && this.myMarker) {
        const newSpot = new Spot();
        const newSpotProfile = new SpotProfile();
        const spotProfileACL = new Parse.ACL();
        const spotACL = new Parse.ACL();
        const markerLatLng = this.myMarker.getLatLng();


        spotProfileACL.setPublicReadAccess(true);
        spotProfileACL.setPublicWriteAccess(false);
        newSpotProfile.setACL(spotProfileACL);
        newSpotProfile.set('latlng', new Parse.GeoPoint({
          latitude: markerLatLng.lat,
          longitude: markerLatLng.lng,
        }));

        spotACL.setPublicReadAccess(false);
        spotACL.setPublicWriteAccess(false);
        newSpot.setACL(spotACL);
        newSpot.set('name', this.myMarkerMetadata.name);
        newSpot.set('phone', this.myMarkerMetadata.phone);
        newSpot.set('email', this.myMarkerMetadata.email);
        newSpot.set('note', this.myMarkerMetadata.note);

        newSpotProfile.set('spot', newSpot);

        try {
          await newSpotProfile.save();

          this.saved = true;
          this.formDisplayed = false;
          this.allSpots.push(newSpot);

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
      this.map.panTo(new L.LatLng(50.026692, 15.764433));

      // Load current dataset from parse
      new Parse.Query(SpotProfile).equalTo('published', true).find().then(this.onSpotsLoaded);

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
  z-index: 2;
  background: rgba(0, 0, 0, .8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;

  &-content {
    max-width: 30em;
  }

  &-steps-wrap {
    display: flex;
  }

  h2 {
    margin-top: 3rem;
  }

  ol {
    text-align: left;
    margin: auto;
    margin-bottom: 3rem;
  }
}

.step-1-caption {
  top: 3rem;
  right: 3rem;
  position: absolute;
  z-index: 2;

  h1 {
    margin: 0;
    text-shadow: 0 0 1rem #ffffff;
  }
}

.form-wrap {
  top: 0;
  right: 0;
  position: absolute;
  z-index: 2;
  height: 100%;
  width: 60%;
  max-width: 40rem;
  background: rgba(0, 0, 0, .8);
  color: #fff;
  text-align: left;
  padding: 2rem 3rem;
  overflow-y: scroll;
}

.form {
  width: 100%;

  .form-control {
    width: 100%;

    &:first-of-type {
      margin-top: 2rem;
    }
  }

  input, textarea {
    margin-bottom: 1rem;
  }
}

.save-msg {
  width: 100%;
  position: absolute;
  bottom: 0;
  z-index: 2;
  padding: 2rem 3rem;
  color: #fff;
  font-size: 1.5rem;

  &-success {
    background: #000;
  }

  &-error {
    background: rgb(216, 18, 18);
  }
}
</style>
