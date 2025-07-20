// button
const editBtn = document.querySelectorAll(".edit-btn");
const runBtn = document.getElementById("run");

// tab bar
const runTab = document.getElementById("run-tab");
const editTab = document.getElementById("edit-tab");
const tabItem = Array.from(document.getElementsByClassName("tab-item"))  as HTMLElement[];

// msg
const msgInfoBox = document.getElementById("msg-info-box");
const msgInfo = document.getElementById("msg-info");
const runLoading = document.getElementById("run-loader");

// data
const tbody = document.getElementById("win-data") as HTMLTableElement;
const lotteryPoolCount = document.getElementById("lottery-pool-count");
const lotteryTime = document.getElementById("lottery-time");

// settings
const worksheetName = document.getElementById("worksheet-name") as HTMLInputElement;
const dataFor = document.getElementById("data-for") as HTMLInputElement;
const dataTo = document.getElementById("data-to") as HTMLInputElement;
const primaryKeyCol = document.getElementById("primary-key-col") as HTMLInputElement;
const statusCol = document.getElementById("status-col") as HTMLInputElement;
const exclusionStatus = document.getElementById("exclusion-status") as HTMLInputElement;

const repeatCount = document.getElementById("repeat-count") as HTMLInputElement;
const isRandom = document.getElementById("is-random") as HTMLInputElement;

const lotteryViews = document.getElementById("lottery-views") as HTMLInputElement;
const intervalMs = document.getElementById("interval-ms") as HTMLInputElement;
const showPosition = document.getElementById("show-position") as HTMLInputElement;

const writeStatusViews = document.getElementById("write-status-views") as HTMLInputElement;
const newStatus = document.getElementById("new-status") as HTMLInputElement;
const writeHistoryViews = document.getElementById("write-history-views") as HTMLInputElement;
const writeHistoryPosition = document.getElementById("write-history-position") as HTMLInputElement;

// Tab bar click event
for (const element of tabItem) {
  element.addEventListener("click", () => {
    for (const item of tabItem) {
      item.classList.remove("active");
      item.querySelector(".tab-title").classList.remove("active");
      item.querySelector(".tab-content").classList.remove("active");
    }
    element.classList.add("active");
    element.querySelector(".tab-title").classList.add("active");
    element.querySelector(".tab-content").classList.add("active");
  });
}

if (tbody) {
  tbody.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    if (target.classList.contains("edit-btn")) {
      const row = target.closest("tr");
      if (row) {
        // console.log(winItems);
        // todo: 加入修改後的寫入設定方法(555行)
        // 移除畫面上的項目
        row.remove();
      }
    }
  });
}

/** Add tryCatch */
async function tryCatch(callback) {
  try {
    await callback();
  } catch (error) {
    console.error(error);
  }
}

// Run button click event
runBtn.addEventListener("click", async () => {
  await tryCatch(run);
});

// Run button animation
async function runButton(runLotteryTime: number) {
  runBtn.style.opacity = "0";
  runBtn.style.zIndex = "-1";
  runLoading.style.opacity = "1";
  runLoading.style.zIndex = "1";
  await setTimeout(() => {
    runLoading.classList.add("visible");
  }, 10);

  await setTimeout(() => {
    runLoading.classList.remove("visible");
    setTimeout(() => {
      runLoading.style.opacity = "0";
      runBtn.style.zIndex = "1";
      runBtn.style.opacity = "1";
      runLoading.style.zIndex = "-1";
    }, 200);
  }, runLotteryTime);
}

function addOrderItemToTable(orderItem: OrderItem) {
  if (!tbody) return;

  const tr = document.createElement("tr");

  // 創建對應的 td
  const tdIndex = document.createElement("td");
  tdIndex.textContent = (tbody.rows.length + 1).toString();

  const tdRegion = document.createElement("td");
  tdRegion.textContent = orderItem.getPropertyValue("region");

  const tdStore = document.createElement("td");
  tdStore.textContent = orderItem.getPropertyValue("store");

  const tdCustomer = document.createElement("td");
  tdCustomer.textContent = orderItem.getPropertyValue("customerName");

  const tdOrderId = document.createElement("td");
  tdOrderId.className = "order-id-col";
  tdOrderId.textContent = orderItem.getPropertyValue("orderId");

  const tdAction = document.createElement("td");
  const button = document.createElement("button");
  button.className = "edit-btn";
  button.textContent = "移除";
  // button.addEventListener("click", async () => {
  //   const target = event.target as HTMLElement;
  //   const row = target.closest("tr");
  //   if (row) {
  //     // 移除畫面上的項目
  //     console.log(winItems);
  //     row.remove();
  //   }
  // });
  tdAction.appendChild(button);

  // 將 td 依序加入 tr
  tr.appendChild(tdIndex);
  tr.appendChild(tdRegion);
  tr.appendChild(tdStore);
  tr.appendChild(tdCustomer);
  tr.appendChild(tdOrderId);
  tr.appendChild(tdAction);

  // 將 tr 加入 tbody
  tbody.appendChild(tr);
}

/** 進入點 */
export async function run() {
  await Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    const config = readConfig(context);
    await runLottery(context, config);
  });
}

/** 讀取設定 */
function readConfig(context: Excel.RequestContext): Config {
  const valueConfig = new ValueConfig();

  valueConfig.worksheetName = context.workbook.worksheets.getItem(worksheetName.value || "總表");
  valueConfig.start = dataFor.value || "A1";
  valueConfig.end = dataTo.value || "E1000";
  valueConfig.primaryKeyName = primaryKeyCol.value || "訂購編號";
  valueConfig.statusName = statusCol.value || "狀態";
  valueConfig.exclusionStatusList = exclusionStatus.value.split(",") || ["-1", "1", "2"];

  valueConfig.repeatCount = Number(repeatCount.value) || 1;
  valueConfig.isRandom = isRandom.checked;

  valueConfig.lotteryViewsWorksheets = context.workbook.worksheets.getItem(lotteryViews.value || "抽獎畫面");
  valueConfig.intervalMs = Number(intervalMs.value) || 45;
  valueConfig.showPos = valueConfig.lotteryViewsWorksheets.getRange(showPosition.value || "D8:D8");

  valueConfig.writeStatusWorksheets = context.workbook.worksheets.getItem(writeStatusViews.value || "總表");
  valueConfig.newStatus = newStatus.value || "1";
  valueConfig.writeHistoryWorksheets = context.workbook.worksheets.getItem(writeHistoryViews.value || "抽獎畫面");
  valueConfig.writeHistoryPosition = writeHistoryPosition.value.split(":") || ["C17", "F21"];

  return valueConfig;
}

const winItems: OrderItem[] = [];

/** 執行抽獎 */
async function runLottery(context: Excel.RequestContext, config: Config) {
  let execute = new Execute(context);

  // 1. 讀取資料
  const orderInfo = await execute.從工作表讀取資料({
    開始: config.start,
    結束: config.end,
    主鍵欄位: config.primaryKeyName,
    狀態欄位: config.statusName,
    排除狀態: config.exclusionStatusList,
    工作表: config.worksheetName
  });

  // 2. 設定資料內容
  const lotteryData = await execute.取得重複資料陣列({
    重複次數: config.repeatCount,
    是否隨機: config.isRandom
  });
  if (lotteryData[0] !== "已全數抽完！") {
    lotteryPoolCount.innerText = String(lotteryData.length);
  } else {
    lotteryPoolCount.innerText = "0";
  }

  // 3. 開始抽獎並在畫面顯示抽獎過程
  const runLotteryTime = lotteryData.length * config.intervalMs;
  await runButton(runLotteryTime);
  if (lotteryData[0] !== "已全數抽完！") {
    lotteryTime.innerText = String(runLotteryTime / 1000);
  } else {
    lotteryTime.innerText = "0";
  }
  // console.log(`單次抽獎預估時間： ${runLotteryTime / 1000} 秒`);

  await execute.循環變更文字({
    間隔毫秒數: config.intervalMs,
    顯示位置: config.showPos
  });

  if (orderInfo.orderCount === 1 && orderInfo.orderDetails[0].status === "-1") {
    const warnIndex = execute.getMessage().findIndex((i) => i.messageType === "warn");

    if (warnIndex > -1) {
      const msg = execute.getMessage()[warnIndex].content;
      msgInfo.classList.add("warn-text");
      msgInfoBox.classList.add("active");
      msgInfo.innerText = msg;
      // console.warn(msg);
    }
    return;
  } else {
    msgInfo.classList.remove("warn-text");
    msgInfoBox.classList.remove("active");
    msgInfo.innerText = "";
  }

  // 4. 寫入抽獎結果
  await execute.取得抽獎結果並寫入紀錄({
    狀態欄工作表: config.writeStatusWorksheets,
    抽出狀態: config.newStatus,
    抽獎歷史工作表: config.writeHistoryWorksheets,
    抽獎歷史寫入位置: config.writeHistoryPosition
  });

  const errorIndex = execute.getMessage().findIndex((i) => i.messageType === "error");
  if (errorIndex > -1) {
    const msg = execute.getMessage()[errorIndex].content;
    msgInfo.classList.add("error-text");
    msgInfoBox.classList.add("active");
    msgInfo.innerText = msg;
    // console.error(msg);
  } else {
    msgInfo.classList.remove("error-text");
    msgInfoBox.classList.remove("active");
    msgInfo.innerText = "";
  }

  const winItem = execute.getWinItem();
  addOrderItemToTable(winItem);
  winItems.push(winItem);
  // 狀態改回0
  // const col = row.querySelector(".order-id-col") as HTMLTableCellElement | null;
  // await execute.setStatusFromTable({
  //   修改物件: col.textContent,
  //   狀態欄工作表: config.writeStatusWorksheets,
  //   設定狀態: '0'
  // })

  execute = null;
}



interface MessageInfo {
  messageType: string;
  content: string;
}

/** 設定interface */
interface Config {
  /** 資料來源工作表 */
  worksheetName: Excel.Worksheet;
  /** 資料範圍開始 */
  start: string;
  /** 資料範圍結束 */
  end: string;
  /** 主鍵欄位名稱 */
  primaryKeyName: string;
  /** 狀態欄位名稱 */
  statusName: string;
  /** 排除狀態 */
  exclusionStatusList: string[];

  /** 重複次數 */
  repeatCount: number;
  /** 是否隨機 */
  isRandom: boolean;

  /** 抽獎畫面工作表 */
  lotteryViewsWorksheets: Excel.Worksheet;
  /** 間隔時間(ms) */
  intervalMs: number;
  /** 抽獎顯示位置 */
  showPos: Excel.Range;

  /** 寫入狀態工作表 */
  writeStatusWorksheets: Excel.Worksheet;
  /** 抽出後新狀態值 */
  newStatus: string;
  /** 寫入抽出紀錄工作表 */
  writeHistoryWorksheets: Excel.Worksheet;
  /** 寫入紀錄位置 */
  writeHistoryPosition: string[];
}

/** 設定類別 */
class ValueConfig implements Config {
  worksheetName: Excel.Worksheet;
  start: string;
  end: string;
  primaryKeyName: string;
  statusName: string;
  exclusionStatusList: string[];

  repeatCount: number;
  isRandom: boolean;

  lotteryViewsWorksheets: Excel.Worksheet;
  intervalMs: number;
  showPos: Excel.Range;

  writeStatusWorksheets: Excel.Worksheet;
  newStatus: string;
  writeHistoryWorksheets: Excel.Worksheet;
  writeHistoryPosition: string[];
}

/** 執行類別 */
class Execute {
  private _context: Excel.RequestContext;
  private _selectedTable: Excel.Range;
  private _worksheetData: OrderInfo;
  private _columnContent: Record<keyof OrderItem, string[]>;
  private _tempData: Array<string> = [];
  private _primaryKeyIndex: number;
  private _statusIndex: number;
  private _winItem: OrderItem;
  private _message: MessageInfo[] = [];

  constructor(環境: Excel.RequestContext) {
    this._context = 環境;
  }

  async 從工作表讀取資料(參數: {
    開始: string;
    結束: string;
    主鍵欄位: string;
    狀態欄位: string;
    排除狀態?: Array<string>;
    工作表: Excel.Worksheet;
  }): Promise<OrderInfo> {
    let orderInfo: OrderInfo = null;

    try {
      orderInfo = new OrderInfo({ start: 參數.開始, end: 參數.結束 });
      this._selectedTable = 參數.工作表.getRange(orderInfo.getDataRange());
      this._selectedTable.load("values");

      await this._context.sync();

      const data: string[][] = this._selectedTable.values;

      // 設定欄位名稱
      orderInfo.columns = data[0];
      // 設定主鍵索引值
      this._primaryKeyIndex = orderInfo.columns.indexOf(參數.主鍵欄位);
      // 設定狀態索引值
      this._statusIndex = orderInfo.columns.indexOf(參數.狀態欄位);
      // 設定須排除狀態值
      const exclusionStatus: Array<string> = 參數.排除狀態 === undefined ? [] : 參數.排除狀態;

      // 開始設值
      const allProperty = OrderItem.getInstance().getAllProperty();
      for (let i = 1; i < data.length; i++) {
        const item = data[i];

        // 如果指定主鍵為空則不新增
        if (item[this._primaryKeyIndex] === "") continue;

        // 如果狀態欄位為指定值則不新增
        if (exclusionStatus.indexOf(String(item[this._statusIndex])) >= 0) continue;

        let orderItem = new OrderItem();
        for (let j = 0; j < allProperty.length; j++) {
          // 如果是客戶名稱，做個資遮蔽
          if (allProperty[j] === allProperty[2]) {
            // 是組合姓名/多組姓名
            if (item[j].length > 4) {
              const names = item[j].split("/").map(i => { return maskName(i) });
              const maskNames = names.join("/");
              orderItem.setPropertyValue(allProperty[j], maskNames);
            } else {
              // 一般3、4字名子
              orderItem.setPropertyValue(allProperty[j], maskName(item[j]));
            }
          } else {
            orderItem.setPropertyValue(allProperty[j], item[j]);
          }
        }

        orderInfo.addDetails(orderItem);
      }

      // 如果已經沒有符合添加條件之物件時
      if (orderInfo.orderCount === 0) {
        const temp = new OrderItem();
        temp.setPropertyValue(allProperty[this._primaryKeyIndex], "已全數抽完！");
        temp.setPropertyValue(allProperty[this._statusIndex], "-1");
        orderInfo.addDetails(temp);
        this._message.push({ messageType: "warn", content: "已全數抽完！" });
      }

      this._worksheetData = orderInfo;
      this._columnContent = orderInfo.aggregateContent().columnContent;

      return orderInfo;
    } catch (error) {
      console.error("無法讀取表格:", error);
      return null;
    }
  }

  async 取得重複資料陣列(參數: {
    資料陣列?: Array<string>;
    重複次數: number;
    是否隨機: boolean;
  }): Promise<Array<string>> {
    let data = this.isNullDataArray(參數.資料陣列);
    let result = [];
    let repeat = 1;

    if (參數.重複次數 != undefined && 參數.重複次數 != null && 參數.重複次數 >= 0) repeat = 參數.重複次數;

    for (let i = 0; i < repeat; i++) {
      result = result.concat(data);
    }

    if (參數.是否隨機) {
      result = this.shuffle(result);
    }

    this._tempData = result;
    return result;
  }

  async 取得抽獎結果並寫入紀錄(參數: {
    狀態欄工作表: Excel.Worksheet;
    抽出狀態: string;
    抽獎歷史工作表: Excel.Worksheet;
    抽獎歷史寫入位置: string[];
  }): Promise<void> {
    // 中獎ID
    const lotteryResult = this._tempData[this._tempData.length - 1];

    // ------寫入歷史資料開始------
    // 開始寫入歷史資料
    const allProperty = OrderItem.getInstance().getAllProperty();
    // 以ID塞選出中獎物件
    const historyDate = this._worksheetData.orderDetails.filter(
      (i) => i.getPropertyValue(allProperty[this._primaryKeyIndex]) === lotteryResult
    )[0];
    this._winItem = historyDate;
    const historyTable = 參數.抽獎歷史工作表.getRange(`${參數.抽獎歷史寫入位置[0]}:${參數.抽獎歷史寫入位置[1]}`);
    historyTable.load("values");
    await this._context.sync();

    // 找出指定範圍空白欄位再寫入(以該行第1列判斷)
    let nullIndex = 0;
    for (let row of historyTable.values) {
      const id = row[0];
      if (id != "") {
        nullIndex++;

        // 超出指定範圍不繼續
        const startIndex = Number(參數.抽獎歷史寫入位置[0].replace(/[^\d]/g, "")) - 1;
        const endIndex = Number(參數.抽獎歷史寫入位置[1].replace(/[^\d]/g, "")) - 1;
        if (nullIndex > endIndex - startIndex) {
          this._message.push({ messageType: "error", content: `第 ${nullIndex + 1} 筆資料寫入時超出指定範圍` });
          return;
        }
      } else {
        break;
      }
    }

    const inputStartLetter = 參數.抽獎歷史寫入位置[0].replace(/[^a-zA-Z]/g, "");
    const inputStartNumber = Number(參數.抽獎歷史寫入位置[0].replace(/[^\d]/g, ""));

    const colVal = inputStartLetter; // 開始欄位英文代號
    const rowVal = nullIndex + inputStartNumber; // 寫入行數 = 空白行數 + 輸入開始行數
    const writeStart = `${colVal}${rowVal}`;
    // 結束範圍大小，因為要排除狀態所以再多-1
    const endSize = this.getColumnIndex(inputStartLetter) + (this._worksheetData.columns.length - 1 - 1);
    const writeEnd = `${this.getColumnLetter(endSize)}${rowVal}`;

    const writeRange = 參數.抽獎歷史工作表.getRange(`${writeStart}:${writeEnd}`);
    writeRange.load("values");
    await this._context.sync();

    // 製作要寫入的資料
    const tempData: any[][] = [[]];
    for (let col = 0; col < this._worksheetData.columns.length; col++) {
      // 排除狀態欄位
      if (allProperty[col] === allProperty[this._statusIndex]) {
        continue;
      }

      tempData[0][col] = historyDate.getPropertyValue(allProperty[col]);
    }

    writeRange.values = tempData;
    await this._context.sync();
    // ------寫入歷史資料結束------

    // ------寫入狀態資料開始------

    // 找到中獎物件於資料表上的索引值
    const foundCell = this._selectedTable.find(lotteryResult, { matchCase: true });
    foundCell.load("address");
    await this._context.sync();
    const resultIndex = Number.parseInt(foundCell.address.replace(/[^\d]/g, ""));

    // 要寫入取得位址; 因為resultIndex是真實位置不是索引值所以 - 1
    const rangeAddress = this.getExcelRange(this._statusIndex, resultIndex - 1);

    // 開始寫入狀態資料
    const statusColumns = 參數.狀態欄工作表.getRange(rangeAddress);
    statusColumns.values = [[參數.抽出狀態]];
    await this._context.sync();

    // 測試資料
    // console.log("抽出訂單編號: " + lotteryResult);
    // console.log("狀態寫入位置: " + this.getExcelRange(this._statusIndex, resultIndex - 1));

    // ------寫入狀態資料結束------
  }

  async removeItemFromTable(selectedTable: Excel.Range) {}

  // 未優化待後人把上面重複的 -- todo: 獨立所有參數
  async setStatusFromTable(參數: { 修改物件: string; 狀態欄工作表: Excel.Worksheet; 設定狀態: string }) {
    // 找到修改物件於資料表上的索引值 作者偷懶直接用設定狀態的表格
    const foundCell = this._selectedTable.find(參數.修改物件, { matchCase: true });
    console.log(參數.修改物件);
    foundCell.load("address");
    await this._context.sync();
    const resultIndex = Number.parseInt(foundCell.address.replace(/[^\d]/g, ""));

    // 要寫入取得位址; 因為resultIndex是真實位置不是索引值所以 - 1
    const rangeAddress = this.getExcelRange(this._statusIndex, resultIndex - 1);

    // 開始寫入狀態資料
    const statusColumns = 參數.狀態欄工作表.getRange(rangeAddress);
    statusColumns.values = [[參數.設定狀態]];
    await this._context.sync();
  }

  async 循環變更文字(參數: { 資料陣列?: Array<string>; 間隔毫秒數: number; 顯示位置: Excel.Range }): Promise<void> {
    const data = this.isNullDataArray(參數.資料陣列);

    for (let i = 0; i < data.length; i++) {
      參數.顯示位置.values = [[data[i]]];
      await this._context.sync();
      await sleep(參數.間隔毫秒數);
    }
  }

  /** 取得警告、錯誤訊息 */
  public getMessage(): MessageInfo[] {
    return this._message;
  }

  public getWinItem() {
    return this._winItem;
  }

  /** 確認輸入資料是否為空，不為空回傳傳入資料，反之回傳tempData，但tempData為空時回傳OderInfo內的資料 */
  private isNullDataArray(dataArray: Array<string> | null | undefined): Array<string> {
    const orderIds = this._tempData.length != 0 ? this._tempData : this._columnContent.orderId;

    if (dataArray === undefined) return orderIds;
    if (dataArray === null) return orderIds;
    if (dataArray.length === 0) return orderIds;

    return dataArray;
  }

  /** 費雪葉特洗牌演算法，將陣列隨機排序 */
  private shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * 以索引值取得欄位英文代號，如 0 -> A
   * @param {number} colIndex 欄位索引值
   */
  private getColumnLetter(colIndex: number): string {
    let letter = "";
    while (colIndex >= 0) {
      letter = String.fromCharCode((colIndex % 26) + 65) + letter;
      colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
  }

  /**
   * 以欄位英文代號取得索引值，如 A -> 0
   * @param {string} columnLetter 欄位英文代號
   */
  private getColumnIndex(columnLetter: string): number {
    let columnIndex = 0;

    for (let i = 0; i < columnLetter.length; i++) {
      columnIndex = columnIndex * 26 + (columnLetter.charCodeAt(i) - 64);
    }

    return columnIndex - 1; // 索引值從 0 開始，所以 -1
  }

  /**
   * 取得選取目標欄位範圍
   * @param {number} colIndex 欄位索引值
   * @param {number} rowIndex 列數索引值
   */
  private getExcelRange(colIndex: number, rowIndex: number): string {
    const columnLetter = this.getColumnLetter(colIndex);
    return `${columnLetter}${rowIndex + 1}:${columnLetter}${rowIndex + 1}`;
  }

  // todo: 抽獎池類別
  // todo: 抽獎結果管理類別
}

interface ItemObject {
  getAllProperty(): (keyof this)[];

  getPropertyValue<K extends keyof this>(key: K): this[K];

  setPropertyValue<K extends keyof this>(key: K, value: this[K]): void;
}

class BaseItem implements ItemObject {
  constructor() {}

  /** 取得所有屬性名稱 */
  public getAllProperty(): (keyof this)[] {
    return Object.keys(this) as (keyof this)[];
  }

  /**
   * 取得指定屬性值
   * @param {K} key 屬性名稱
   */
  public getPropertyValue<K extends keyof this>(key: K): this[K] {
    return this[key];
  }

  /**
   * 設定指定的屬性值
   * @param {K} key 屬性名稱
   * @param {this[K]} value 設定值
   */
  public setPropertyValue<K extends keyof this>(key: K, value: this[K]): void {
    if (!this.isValid(value)) return;

    this[key] = value;
  }

  protected isValid(value: any) {
    if (value === null) return false;
    if (value === "") return false;

    return true;
  }
}

class OrderInfo {
  private _dataRange: { start: string; end: string };
  private _columns: string[];
  private _orderCount: number = 0;
  private _orderItems: OrderItem[];
  private _columnContent: Record<keyof OrderItem, string[]>;

  constructor(dataRange: { start: string; end: string }) {
    this._dataRange = dataRange;
    this._columns = [];
    this._orderItems = [];
    this._orderCount = this.orderCount;
    this._columnContent = {} as Record<keyof OrderItem, string[]>;
  }

  public set dataRange(value: { start: string; end: string }) {
    this._dataRange = value;
  }
  public set columns(value: string[]) {
    this._columns = value;
  }
  public set orderDetails(value: OrderItem[]) {
    this._orderItems = value;
    this.orderCount = this._orderItems.length;
  }
  public set orderCount(value: number) {
    this._orderCount = value;
  }
  public addDetails(value: OrderItem) {
    this._orderItems.push(value);
    this.orderCount = this._orderItems.length;
  }

  public getDataRange() {
    return `${this._dataRange.start}:${this._dataRange.end}`;
  }
  public get columns() {
    return this._columns;
  }
  public get orderDetails() {
    return this._orderItems;
  }
  public get orderCount() {
    return this._orderCount;
  }
  public get columnContent() {
    return this._columnContent;
  }

  /** 彙整內容成，欄位所有值 */
  public aggregateContent(): this {
    // 取得所有欄位屬性名稱
    const keys = OrderItem.getInstance().getAllProperty();

    // 設定彙整物件屬性(等於欄位屬性名稱)
    for (let i = 0; i < keys.length; i++) {
      let property = keys[i].replace(/_/, "");
      this._columnContent[property] = [];
    }

    // 將訂單明細欄位資料塞入彙整物件對應欄位
    for (let i = 0; i < this._orderItems.length; i++) {
      for (let k of keys) {
        this._columnContent[k.replace(/_/, "")].push(this._orderItems[i].getPropertyValue(k) as string);
      }
    }

    return this;
  }
}

class OrderItem extends BaseItem {
  private _region: string = "";
  private _store: string = "";
  private _customerName: string = "";
  private _orderId: string = "";
  private _status: string = "";

  constructor() {
    super();
  }

  /** 地區 */
  public set region(value: string) {
    if (!this.isValid(value)) return;

    this._region = value;
  }
  /** 店面 */
  public set store(value: string) {
    if (!this.isValid(value)) return;

    this._store = value;
  }
  /** 客戶姓名 */
  public set customerName(value: string) {
    if (!this.isValid(value)) return;

    this._customerName = value;
  }
  /** 訂購編號 */
  public set orderId(value: string) {
    if (!this.isValid(value)) return;

    this._orderId = value;
  }
  /** 狀態 */
  public set status(value: string) {
    if (!this.isValid(value)) return;

    this._status = value;
  }

  public get region() {
    return this._region;
  }
  public get store() {
    return this._store;
  }
  public get customerName() {
    return this._customerName;
  }
  public get orderId() {
    return this._orderId;
  }
  public get status() {
    return this._status;
  }

  /** 取得實例 */
  public static getInstance() {
    return new OrderItem();
  }
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** 姓名個資遮蔽 */
function maskName(name: string): string {
  return name.replace(/^(.)(.*)(.)$/, (_, first, middle, last) =>
    `${first}${middle.replace(/./g, "○")}${last}`
  );
}

