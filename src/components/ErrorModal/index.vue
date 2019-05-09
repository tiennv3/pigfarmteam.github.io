<template>
  <div class="modal animated fadeIn fast">
    <div class="modal-container">
      <button class="modal-close-btn" @click="() => store.isShowErrorModal = false" />
      <div class="modal-title red">
        Error
      </div>
      <div :style="bodyTextStyle(store.errorMessage)">
        <div v-for="msg in splitToError(store.errorMessage)" :key="msg">
          <div v-html="msg" style="margin-bottom: 5px"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _store from '../../store';

export default {
  data() {
    return {
      store: _store
    }
  },
  methods: {
    splitToError(msg) {
      return msg.split('\n');
    },
    bodyTextStyle(msg) {
      if (msg.length > 150) {
        return {
          fontFamily: 'monospace',
          fontSize: '14px'
        }
      }
      return {}
    }
  }
}
</script>