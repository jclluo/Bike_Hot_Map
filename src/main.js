import App from './App.svelte';
import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

const config = {
  kit: {
    adapter: adapter({
      // default options are shown
      pages: 'build',
      assets: 'build',
      fallback: null
    }),
    // If your repo is named `repo-name`, set the base path as follows
    paths: {
      base: '/repo-name',
    },
  },
  preprocess: preprocess(),
};


var app = new App({
	target: document.body
});

export default app;
