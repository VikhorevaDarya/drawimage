import { createApp } from "vue";
import App from "./App";
import EditorComponent from "./components/Editor.vue";

if (process.env.NODE_ENV === 'development') {
  createApp(App).mount("#app");
}

export default EditorComponent;
