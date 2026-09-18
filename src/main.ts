import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'
import { setStorageErrorHandler } from './adapters/StorageAdapter'
import { toast } from './utils/toast'
import { registerAppSW } from './utils/pwa'

setStorageErrorHandler((msg) => toast(msg, 3200))

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

registerAppSW()

