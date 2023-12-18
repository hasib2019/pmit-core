import schedule from "node-schedule";
import axios from "axios";

export function materializedViewUpdate() {
  schedule.scheduleJob("* 1 * * *", async () => {
    await axios.put("http://127.0.0.1:8090/master/mv/materializedView");
  });
}
