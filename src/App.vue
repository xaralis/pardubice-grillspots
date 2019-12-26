<template>
  <div id="app">
    <Griloviste :accessToken="accessToken" />
  </div>
</template>

<script>
import Griloviste from './components/Griloviste.vue'

export default {
  name: 'app',
  components: {
    Griloviste
  },
  data: () => ({
    accessToken: process.env.VUE_APP_MAPBOX_ACCESS_TOKEN
  })
}
</script>

<style>
@import url(https://fonts.googleapis.com/css?family=Bebas+Neue|Roboto+Condensed:300,700&display=swap&subset=latin-ext);

* {
  box-sizing: border-box;
}

h1 {
  font-family: 'Bebas Neue';
  font-weight: 400;
}

b, strong {
  font-weight: 700 !important;
}

#app {
  font-family: 'Roboto Condensed', Helvetica, Arial, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  font-weight: 300;
  font-size: 16px;
  color: #000;
  height: 100%;
  min-height: 100vh;
}
</style>
