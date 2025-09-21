import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { AppExtension, AppManifest } from "@saleor/app-sdk/types";

import packageJson from "@/package.json";

import { orderCreatedWebhook } from "./webhooks/order-created";
import { orderFilterShippingMethodsWebhook } from "./webhooks/order-filter-shipping-methods";

/**
 * App SDK helps with the valid Saleor App Manifest creation. Read more:
 * https://github.com/saleor/saleor-app-sdk/blob/main/docs/api-handlers.md#manifest-handler-factory
 */
export default createManifestHandler({
  async manifestFactory({ appBaseUrl, request, schemaVersion }) {
    /**
     * Allow to overwrite default app base url, to enable Docker support.
     *
     * See docs: https://docs.saleor.io/docs/3.x/developer/extending/apps/local-app-development
     */
    const iframeBaseUrl = process.env.APP_IFRAME_BASE_URL ?? appBaseUrl;
    const apiBaseURL = process.env.APP_API_BASE_URL ?? appBaseUrl;

    // 确保 URL 是绝对路径且格式正确
    const ensureAbsoluteUrl = (url: string) => {
      // 如果已经是完整的 URL，直接返回
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // 如果基础 URL 末尾有斜杠，去掉它
      const cleanBaseURL = apiBaseURL.endsWith('/') ? apiBaseURL.slice(0, -1) : apiBaseURL;
      
      // 如果路径开头没有斜杠，加上它
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      
      return `${cleanBaseURL}${cleanPath}`;
    };

    // 确保 appUrl 是有效的绝对 URL
    const getAppUrl = () => {
      if (iframeBaseUrl.startsWith('http://') || iframeBaseUrl.startsWith('https://')) {
        return iframeBaseUrl;
      }
      return apiBaseURL;
    };

    const extensions: AppExtension[] = [
      {
        label: "Product Timestamps",
        mount: "PRODUCT_DETAILS_MORE_ACTIONS",
        target: "POPUP",
        permissions: ["MANAGE_PRODUCTS"],
        url: ensureAbsoluteUrl("/api/server-widget")
      },
      {
        label: "Order widget example", 
        mount: "ORDER_DETAILS_MORE_ACTIONS",
        target: "POPUP",
        permissions: ["MANAGE_ORDERS"],
        url: ensureAbsoluteUrl("/client-widget")
      },
      {
        label: "高级富文本编辑器",
        mount: "PRODUCT_DETAILS_MORE_ACTIONS",
        target: "APP_PAGE",
        permissions: ["MANAGE_PRODUCTS"],
        url: "/rich-editor"
      }
    ];

    const manifest: AppManifest = {
      name: "富文本编辑器扩展",
      tokenTargetUrl: ensureAbsoluteUrl("/api/register"),
      appUrl: getAppUrl(),
      /**
       * Set permissions for app if needed
       * https://docs.saleor.io/docs/3.x/developer/permissions
       */
      permissions: [
        /**
         * Add permission to allow "ORDER_CREATED" / "ORDER_FILTER_SHIPPING_METHODS" webhooks registration.
         *
         * This can be removed
         */
        "MANAGE_ORDERS",
        "MANAGE_PRODUCTS"
      ],
      id: "rich.text.editor.app",
      version: packageJson.version,
      /**
       * Configure webhooks here. They will be created in Saleor during installation
       * Read more
       * https://docs.saleor.io/docs/3.x/developer/api-reference/webhooks/objects/webhook
       *
       * Easiest way to create webhook is to use app-sdk
       * https://github.com/saleor/saleor-app-sdk/blob/main/docs/saleor-webhook.md
       */
      webhooks: [
        orderCreatedWebhook.getWebhookManifest(apiBaseURL),
        orderFilterShippingMethodsWebhook.getWebhookManifest(apiBaseURL),
      ],
      /**
       * Optionally, extend Dashboard with custom UIs
       * https://docs.saleor.io/docs/3.x/developer/extending/apps/extending-dashboard-with-apps
       */
      extensions: extensions,
      author: "OpenAegis",
      about: "为商品详情提供高级富文本编辑功能",
      brand: {
        logo: {
          default: ensureAbsoluteUrl("/logo.png"),
        },
      },
    };

    return manifest;
  },
});