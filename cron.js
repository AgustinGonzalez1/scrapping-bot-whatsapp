import cron from "node-cron";
import { checkWhatsAppWeb } from "./desarrollador_fronted.js";



cron.schedule("*/3 * * * *", () => {
  console.log("Revisando LinkedIn...");
  try{
    checkWhatsAppWeb()
  }catch(e){
    checkWhatsAppWeb()
  }
});
