/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Vue SFC 标准模块声明
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  type _Empty = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<_Empty, _Empty, any>
  export default component
}
