/* Solo per il typecheck del pacchetto da solo: dentro le app la stessa
   dichiarazione arriva dai tipi di Next. */
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
