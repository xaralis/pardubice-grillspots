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

<style lang="scss">
@import url(https://fonts.googleapis.com/css?family=Bebas+Neue|Roboto+Condensed:300,700&display=swap&subset=latin-ext);

html {
  // 1 rem
  font-size: 16px;
}

* {
  box-sizing: border-box;
}

h1, h2 {
  font-family: 'Bebas Neue';
  font-weight: 400;
}

h2 {
  font-size: 1.666em;
  margin: 0.3em 0;
}

ul, ol {
  margin: 0;
}

b, strong {
  font-weight: 700 !important;
}

.button {
  border: 0;
  width: 100%;
  display: inline-block;
  background-color: rgba(0, 0, 0, .4);
  padding: 1rem 3rem;
  color: #fff;
  font-size: 1.5rem !important;
  transition: background-color .3s ease-in-out;
  cursor: pointer;
  font-family: 'Bebas Neue' !important;

  &:hover {
    background-color: rgba(0, 0, 0, 1);
  }

  @media (min-width: 768px) {
    width: auto;
  }
}

.form {
  input {
    width: 100%;
    display: block;
    border: 0;
    height: 3rem;
    line-height: 3rem;
    padding: 0 1rem;
  }

  textarea {
    height: 12rem;
    padding: 1rem;
  }

  input, textarea {
    width: 100%;
    display: block;
    border: 0;
    background-color: rgba(255, 255, 255, 0.8);
    font-size: 1.5rem;
    transition: background-color .3s ease-in-out;
  }

  input:focus, input:hover, textarea:focus, textarea:hover {
    background-color: rgba(255, 255, 255, 1);
    outline: none;
  }

  input::placeholder, textarea::placeholder {
    color: rgba(0, 0, 0, 0.4);
    font-size: 1.5rem;
  }
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
