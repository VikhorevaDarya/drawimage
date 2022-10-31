<template>
  <div>
    <div v-if="isLoading">Loading...</div>
    <EditorComponent v-else :img-file="file" @on-save="save" @close="close" />
  </div>
</template>

<script>
import EditorComponent from "./components/Editor.vue";
import pic from "./assets/images/pizdos.jpeg";
import { ref } from "vue";

export default {
  name: "App",
  components: {
    EditorComponent,
  },
  setup() {
    const isLoading = ref(true);
    const file = ref(null);

    const save = (file) => {
      console.log("SAVE A FILE", file);
    };

    const close = () => {
      console.log("close");
    };

    fetch(pic)
      .then((res) => res.blob())
      .then((blob) => {
        file.value = new File([blob], "pic", { type: "img/jpeg" });
        isLoading.value = false;
      });

    return {
      file,
      isLoading,
      save,
      close,
    };
  },
};
</script>
