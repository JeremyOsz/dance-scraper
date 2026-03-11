declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  };

  type WithPwa = (config: NextConfig) => NextConfig;

  function withPWAInit(options: PwaOptions): WithPwa;

  export default withPWAInit;
}
