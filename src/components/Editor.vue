<template>
  <form>
    <section id="editor" class="editor">
      <header class="editor__header">
        <button
          type="button"
          class="editor__button editor__button_back"
          @click="$emit('close')"
        >
          <BackIcon />
          <span class="editor__text">Edit image</span>
        </button>
        <nav class="editor__header-tools">
          <button
            type="button"
            class="editor__button editor__button_undo"
            :class="{ editor__button_disabled: isDisableUndoButton }"
            @click="undo"
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            class="editor__button editor__button_redo"
            :class="{ editor__button_disabled: isDisableRedoButton }"
            @click="redo"
          >
            <RedoIcon />
          </button>
        </nav>
      </header>
      <main
        ref="HTMLEditorContainer"
        id="editor-content"
        class="editor__content"
        :style="`height: calc(${windowHeight}px - 151px)`"
      ></main>
      <footer class="editor__footer">
        <nav class="editor__footer-tools">
          <button
            type="button"
            class="editor__button editor__button_undo"
            :class="{ editor__button_active: mode === 'crop' }"
            @click="startCrop"
          >
            <CropIcon />
          </button>
          <button
            type="button"
            class="editor__button editor__button_redo"
            :class="{ editor__button_active: mode === 'flip' }"
            @click="flip"
          >
            <ReflectIcon />
          </button>
          <button
            type="button"
            class="editor__button editor__button_undo"
            :class="{ editor__button_active: mode === 'rotate' }"
            @click="rotate(90)"
          >
            <RotateIcon />
          </button>
          <button
            type="button"
            class="editor__button editor__button_redo"
            :class="{ editor__button_active: mode === 'draw' }"
            @click="startDraw"
          >
            <DrawIcon />
          </button>
          <div class="editor__colorpicker" v-if="mode === 'draw'">
            <div class="editor__dividing-line"></div>
            <div class="editor__colorpicker-input">
              <ColorPicker
                alpha-channel="hide"
                :visible-formats="['hex']"
                @color-change="updateColor"
                :color="'#FFFFFF'"
              />
            </div>
            <div class="editor__line-stroke">
              <LinesIcon />
              <div class="editor__change-stroke">
                <ArrowIcon @click="incrementLineStroke" class="editor__arrow" />
                {{ line }}
                <div class="editor__arrow editor__arrow_down">
                  <ArrowIcon @click="decrementLineStroke" />
                </div>
              </div>
            </div>
          </div>
          <div class="editor__crop-tools" v-if="mode === 'crop'">
            <div class="editor__dividing-line"></div>
            <ApplyIcon @click="applyCrop" class="editor__crop-icon" />
            <CancelIcon @click="cancelCrop" class="editor__crop-icon" />
          </div>
        </nav>
        <button
          type="submit"
          class="editor__button editor__button_primary editor__button_submit"
          @click="submit"
        >
          Done
        </button>
      </footer>
    </section>
  </form>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from "vue";
import ImageEditor from "tui-image-editor";
import BackIcon from "../shared/svg/BackIcon.vue";
import CropIcon from "../shared/svg/CropIcon.vue";
import DrawIcon from "../shared/svg/DrawIcon.vue";
import LinesIcon from "../shared/svg/LinesIcon.vue";
import RedoIcon from "../shared/svg/RedoIcon.vue";
import ReflectIcon from "../shared/svg/ReflectIcon.vue";
import RotateIcon from "../shared/svg/RotateIcon.vue";
import ApplyIcon from "@/shared/svg/ApplyIcon";
import CancelIcon from "@/shared/svg/CancelIcon";
import ArrowIcon from "@/shared/svg/ArrowIcon";
import { ColorPicker } from "vue-accessible-color-picker";
import hsl from "hsl-to-hex";
import {
  base64ToBlob,
  blobToFile,
  calculateAspectRatioFit,
  getDimensionsFromDataUrl,
} from "@/helpers";

export default {
  name: "EditorComponent",
  components: {
    BackIcon,
    ArrowIcon,
    CropIcon,
    DrawIcon,
    ApplyIcon,
    CancelIcon,
    LinesIcon,
    RedoIcon,
    ReflectIcon,
    RotateIcon,
    ColorPicker,
  },
  emits: ["close"],
  props: {
    imgName: { type: String },
    imgFile: { type: File },
  },
  setup(props, { emit }) {
    const mode = ref("");
    let imageEditorInstance = null;
    const HTMLEditorContainer = ref("");
    let imageEditorBrashSettings = {
      width: 4,
      color: "rgba(0, 0, 0, 1)",
    };

    const line = ref(imageEditorBrashSettings.width);
    const isDisableUndoButton = ref(true);
    const isDisableRedoButton = ref(true);
    const trackThumbColor = ref("rgba(0, 0, 0, 1)");
    const windowHeight = ref(window.innerHeight);

    const getFilterUndoStack = () => {
      return imageEditorInstance._invoker._undoStack.filter(
        (command) => command.name !== "resizeCanvasDimension"
      );
    };

    const setDocumentHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty("height", `${windowHeight.value}px`);
    };

    const getAspectRatioCanvasDimensions = () => {
      return getDimensionsFromDataUrl(
        window.URL.createObjectURL(props.imgFile)
      ).then((dimensions) => {
        const contentEditor = document.querySelector(".editor__content");
        const contentEditorDimensions = {
          width: contentEditor.clientWidth,
          height: contentEditor.clientHeight - 150,
        };
        return calculateAspectRatioFit(
          dimensions.width,
          dimensions.height,
          contentEditorDimensions.width,
          contentEditorDimensions.height
        );
      });
    };

    const changeCanvasDimensions = () => {
      getAspectRatioCanvasDimensions().then((aspectRationFit) => {
        imageEditorInstance.resizeCanvasDimension({
          width: aspectRationFit.width,
          height: aspectRationFit.height,
        });

        imageEditorInstance._invoker._undoStack = getFilterUndoStack();
      });
      windowHeight.value = window.innerHeight;
      setDocumentHeight();
    };

    onMounted(() => {
      if (props.imgFile) {
        getAspectRatioCanvasDimensions().then((aspectRationFit) => {
          const initialOptions = {
            cssMaxWidth: aspectRationFit.width,
            cssMaxHeight: aspectRationFit.height,
            applyCropSelectionStyle: true,
            applyGroupSelectionStyle: true,
            selectionStyle: {
              cornerStyle: "circle",
              cornerSize: 16,
              cornerColor: "#fff",
              cornerStrokeColor: "#fff",
              transparentCorners: false,
              lineWidth: 2,
              borderColor: "#fff",
            },
          };

          const CustomImageEditor = new ImageEditor(
            HTMLEditorContainer.value,
            initialOptions
          );

          const onSuccessLoadImage = () => {
            imageEditorInstance.clearUndoStack();
            imageEditorInstance.clearRedoStack();
            window.addEventListener("resize", changeCanvasDimensions);
          };

          const onErrorLoadImage = (error) => {
            console.log("Error from load image file", error.message);
          };

          CustomImageEditor.loadImageFromFile(props.imgFile, props.imgFile.name)
            .then(onSuccessLoadImage)
            .catch(onErrorLoadImage);

          imageEditorInstance = CustomImageEditor;

          imageEditorInstance.on("undoStackChanged", (undoStackLength) => {
            const filterUndoStackLength = getFilterUndoStack().length;
            isDisableUndoButton.value =
              filterUndoStackLength === undoStackLength
                ? !undoStackLength
                : !filterUndoStackLength;
          });

          imageEditorInstance.on("redoStackChanged", (redoStackLength) => {
            isDisableRedoButton.value = !redoStackLength;
          });
        });
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", changeCanvasDimensions);
    });

    const undo = () => {
      const isCanUndo = !imageEditorInstance.isEmptyUndoStack();

      if (isCanUndo) {
        imageEditorInstance.discardSelection();
        imageEditorInstance.undo();
      }
    };

    const redo = () => {
      const isCanRedo = !imageEditorInstance.isEmptyRedoStack();

      if (isCanRedo) {
        imageEditorInstance.discardSelection();
        imageEditorInstance.redo();
      }
    };

    const stopPrevActionMode = () => {
      imageEditorInstance.discardSelection();
      imageEditorInstance.stopDrawingMode();
    };

    const rotate = (degree) => {
      stopPrevActionMode();
      imageEditorInstance.rotate(degree);

      mode.value = "rotate";
      setTimeout(() => {
        mode.value = "";
      });
    };

    const flip = () => {
      stopPrevActionMode();
      imageEditorInstance.flipX();

      mode.value = "flip";
      setTimeout(() => {
        mode.value = "";
      });
    };

    const startCrop = () => {
      stopPrevActionMode();
      imageEditorInstance.startDrawingMode("CROPPER");

      mode.value = "crop";
    };

    const stopCrop = () => {
      imageEditorInstance
        .crop(imageEditorInstance.getCropzoneRect())
        .then(() => {
          imageEditorInstance.stopDrawingMode();
        });

      mode.value = "";
    };

    const reactiveDraw = () => {
      const brashSettings = getBrashSettings();
      imageEditorInstance.startDrawingMode("FREE_DRAWING", {
        color: brashSettings.color,
        width: brashSettings.width,
      });
    };

    const startDraw = () => {
      if (mode.value === "draw") {
        stopDraw();
      } else {
        stopPrevActionMode();
        reactiveDraw();

        mode.value = "draw";
      }
    };

    const stopDraw = () => {
      imageEditorInstance.stopDrawingMode();

      mode.value = "";
    };

    const getBrashSettings = () => {
      return imageEditorBrashSettings;
    };

    const setBrashSettings = (settings) => {
      imageEditorBrashSettings = {
        ...imageEditorBrashSettings,
        ...settings,
      };
    };

    const getImageName = () => {
      return imageEditorInstance.getImageName();
    };

    const createBlobFile = () => {
      const dataURL = imageEditorInstance.toDataURL();

      return base64ToBlob(dataURL);
    };

    const submit = (event) => {
      event.preventDefault();
      const blobObject = createBlobFile();
      const file = blobToFile(blobObject, props.imgFile);
      emit("on-save", { file });
    };

    const updateColor = (event) => {
      imageEditorInstance.stopDrawingMode();

      const [h] = event.cssColor.match(/\d+/g);
      const newColor = hsl(h, 100, 50);
      setBrashSettings({
        color: newColor,
      });

      trackThumbColor.value = newColor;

      reactiveDraw();
    };

    const updateLineWidth = (event) => {
      imageEditorInstance.stopDrawingMode();

      setBrashSettings({
        width: event.target.value,
      });

      reactiveDraw();
    };

    const applyCrop = () => {
      const { width, height } = imageEditorInstance.getCropzoneRect();
      if (width > 0.5 || height > 0.5) {
        stopCrop();
      }
    };

    const cancelCrop = () => {
      imageEditorInstance.stopDrawingMode();

      mode.value = "";
    };

    const incrementLineStroke = () => {
      imageEditorInstance.stopDrawingMode();

      setBrashSettings({
        width:
          imageEditorBrashSettings.width < 30
            ? imageEditorBrashSettings.width + 1
            : imageEditorBrashSettings.width,
      });
      line.value = getBrashSettings().width;

      reactiveDraw();
    };

    const decrementLineStroke = () => {
      imageEditorInstance.stopDrawingMode();

      setBrashSettings({
        width:
          imageEditorBrashSettings.width > 0
            ? imageEditorBrashSettings.width - 1
            : imageEditorBrashSettings.width,
      });
      line.value = getBrashSettings().width;

      reactiveDraw();
    };

    return {
      mode,
      HTMLEditorContainer,
      trackThumbColor,
      incrementLineStroke,
      decrementLineStroke,
      rotate,
      undo,
      redo,
      updateLineWidth,
      startDraw,
      flip,
      updateColor,
      startCrop,
      submit,
      line,
      stopCrop,
      getImageName,
      applyCrop,
      cancelCrop,
      isDisableUndoButton,
      isDisableRedoButton,
      windowHeight,
    };
  },
};
</script>

<style lang="less">
@import "../utils/const.less";
@import "../../styles.scss";
@import "../../editor.scss";

.editor {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: auto;
  background-color: @grey;

  @media (min-width: @tablet) {
    max-width: 800px;
    border-radius: 12px;
    width: 800px;
    height: calc(100vh - 64px);
    margin: 25px auto 64px;
  }

  @media (min-width: @desktop) {
    max-width: 1088px;
    width: 1088px;
    height: calc(100vh - 80px);
    margin-top: 40px;
  }

  .vacp-color-space,
  .vacp-color-input-group,
  .vacp-range-input-label-text,
  .vacp-range-input-label-text--hue,
  .vacp-copy-button {
    display: none;
  }

  .canvas__colorpicker {
    position: absolute;
    bottom: 120px;
    left: 20px;
  }

  .vacp-color-picker {
    padding: 0;
    display: block;
    background-color: unset;
    border-radius: 19px;
    width: 100%;
    height: 10px;
    --vacp-spacing: 3px;
    --vacp-color-space-width: unset;

    @media (min-width: @tablet) {
      width: 173px;
    }
  }

  .vacp-range-input,
  .vacp-range-input--hue {
    border-radius: 19px;

    &:focus {
      border: none;
    }
  }

  input[type="range"]::-webkit-slider-runnable-track {
    border-radius: 19px;
  }

  input[type="range"]::-webkit-slider-thumb {
    border: 3px solid white;
    background-color: v-bind(trackThumbColor);
    width: 20px;
    height: 20px;
    margin-top: -5px;
    -webkit-appearance: none;
    box-shadow: none;
  }

  &__crop-icon {
    cursor: pointer;
  }

  &__colorpicker {
    position: absolute;
    bottom: 100px;
    left: 20px;
    width: 93%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 17px;

    @media (min-width: @tablet) {
      bottom: 4px !important;
      left: 215px !important;
      gap: 20px;
      width: unset;
      justify-content: flex-start;
    }
    @media (min-width: @desktop) {
      bottom: 8px !important;
      left: 241px !important;
    }

    &-input {
      width: 100%;

      @media (min-width: @tablet) {
        margin-left: -20px;
      }

      @media (min-width: @desktop) {
        margin-left: 0;
      }
    }
  }

  &__change-stroke {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 8px;
    gap: 5px;
  }

  &__arrow {
    &_down {
      transform: rotateX(180deg);
      margin-top: -6px;
    }
  }

  &__crop-tools {
    position: absolute;
    bottom: 120px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 30px;

    @media (min-width: @tablet) {
      bottom: 21px !important;
      left: 215px !important;
    }

    @media (min-width: @desktop) {
      bottom: 25px !important;
      left: 242px !important;
    }
  }

  &__dividing-line {
    display: none;

    @media (min-width: @tablet) {
      display: block;
      background: #e1e6ea;
      border-radius: 200px;
      width: 2px;
      height: 32px;
      margin: 0 20px 0 16px;
    }
  }

  &__line-stroke {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: "Poppins";
    font-style: normal;
    font-weight: 500;
    font-size: 16px;
    line-height: 140%;
    letter-spacing: -0.02em;
    color: #69717e;

    & input {
      border: none;
      font-family: "Poppins";
      font-style: normal;
      font-weight: 500;
      font-size: 16px;
      line-height: 140%;
      letter-spacing: -0.02em;
      color: #69717e;
      background-color: @grey;
      -webkit-appearance: none;

      @media (min-width: @tablet) {
        background-color: white;
      }

      & option {
        border: none;
      }

      &:active,
      &:focus {
        border: none;
        outline: none;
      }

      &::-webkit-scrollbar {
        width: 1px;
      }
    }
  }

  &__header {
    position: relative;
    top: 0;
    width: 100%;
    min-height: 60px;
    display: flex;
    justify-content: space-between;
    background-color: @utility-white;

    @media (min-width: @tablet) {
      max-width: 800px;
      min-height: 68px;
      border-radius: 12px 12px 0 0;
    }

    @media (min-width: @desktop) {
      max-width: 1088px;
      width: 1088px;
    }

    &-tools {
      display: flex;
      align-items: center;
      margin-right: 12px;

      @media (min-width: @tablet) {
        margin-right: 24px;
      }
    }
  }

  &__text {
    font-family: "Poppins";
    font-style: normal;
    font-weight: 500;
    font-size: 14px;
    line-height: 140%;
    color: @black;

    @media (min-width: @tablet) {
      font-size: 16px;
    }
  }

  &__button {
    all: unset;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;

    &_disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    &_active {
      background: rgba(236, 242, 252, 0.8);
      border-radius: 4px;
    }

    &_undo {
      transform: scale(-1, 1);
    }

    &_redo {
    }

    &_submit {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 8px;
      color: @utility-white;
      width: 76px;
      height: 36px;
      background: @blue;
      border-radius: 8px;
      margin: 15px 20px;
      font-family: "Poppins";
      font-style: normal;
      font-weight: 500;
      font-size: 14px;
      line-height: 140%;
      letter-spacing: -0.02em;

      @media (min-width: @tablet) {
        width: 85px;
        height: 40px;
        margin: 15px 24px;
      }
    }

    &_back {
      display: flex;
      align-items: center;
      margin-left: 18px;
      cursor: pointer;
      width: unset;
      height: unset;
      gap: 8px;

      & svg {
        width: 24px;
        height: 24px;
      }

      @media (min-width: @tablet) {
        margin-left: 24px;
        gap: 12px;
      }
    }
  }

  &__content {
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 91px;
    background-color: @utility-white;

    &-tools {
      display: flex;
      justify-content: space-between;
      margin: 15px 0 40px 20px;
      min-width: 192px;

      @media (min-width: @tablet) {
        margin: 0 0 0 26px;
        min-width: 164px;
      }

      @media (min-width: @desktop) {
        min-width: 192px;
      }
    }

    @media (min-width: @tablet) {
      width: 800px;
      height: 72px;
      align-items: center;
      border-radius: 0 0 12px 12px;
    }

    @media (min-width: @desktop) {
      width: 1088px;
      height: 80px;
    }
  }
}

.tui-image-editor-canvas-container {
  .lower-canvas,
  .upper-canvas {
    object-fit: scale-down;
    aspect-ratio: 1;
  }
}
</style>
