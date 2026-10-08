/**
 * Chạy: node tests/all-api.test.mjs (từ backend), hoặc npm.cmd run test:api.
 * HTTP thật -> server.js/routes/controllers thật -> MongoDB database test riêng.
 * Zalo, ZaloPay, Cloudinary được giả lập tại ranh giới dịch vụ bên ngoài.
 * Không sửa .env; không gọi giao dịch thật; không sửa database ứng dụng.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Destination from "../models/Destination.js";
import Article from "../models/Article.js";
import Tour from "../models/Tour.js";
import Departure from "../models/Departure.js";
import Booking from "../models/Booking.js";
import Coupon from "../models/Coupon.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Review from "../models/Review.js";
import NotificationRead from "../models/NotificationRead.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localEnv = dotenv.parse(fs.readFileSync(path.join(backendDir, ".env")));
const runId = Date.now() + "-" + randomBytes(4).toString("hex");
const databaseName = "vna_api_test_" + runId.replaceAll("-", "_");
const outJson = path.join(backendDir, "test-results", "all-api-results.json");
const outMd = path.join(backendDir, "test-results", "KET_QUA_TEST_TOAN_BO_API.md");
const startedAt = new Date();
const models = [User, Destination, Article, Tour, Departure, Booking, Coupon, PaymentTransaction, Review, NotificationRead];
const nativeFetch = globalThis.fetch;
const originalAxiosPost = axios.post;
const originalUpload = cloudinary.uploader.upload;
const originalListen = express.application.listen;
const originalConnect = mongoose.connect;
let server, baseUrl, current, ready = false, reportWritten = false, fatalError = null;
let zaloMode = "success", paymentMode = "success", uploadMode = "success";
let queryMode = "normal", refundMode = "processing", refundQueryMode = "processing";
const providerOrders = new Map();
let dbDropped = false;
const results = [], requests = [], externalCalls = [];
const state = {};
const adminPassword = "ApiTest-" + randomBytes(12).toString("hex");
const sessionSecret = "isolated-api-test-" + randomBytes(32).toString("hex");

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [
    k, /token|password|secret|key1|key2|authorization|^mac$|MONGO_URI/i.test(k) ? "[REDACTED]" : redact(v)
  ]));
}
function safeError(error) {
  let message = error?.message || String(error);
  for (const v of [localEnv.MONGO_URI, localEnv.JWT_SECRET, localEnv.ADMIN_PASSWORD,
    localEnv.ZALO_APP_SECRET, localEnv.ZALOPAY_KEY1, localEnv.ZALOPAY_KEY2,
    localEnv.CLOUDINARY_API_KEY, localEnv.CLOUDINARY_API_SECRET]) {
    if (v && v.length >= 8) message = message.split(v).join("[REDACTED]");
  }
  return message.slice(0, 2500);
}
function discoverEndpoints() {
  const src = fs.readFileSync(path.join(backendDir, "server.js"), "utf8");
  const imports = new Map([...src.matchAll(/import (\w+) from "(\.\/routes\/[^"]+)";/g)].map(m => [m[1],m[2]]));
  const endpoints = [{method:"GET",path:"/"}];
  for (const m of src.matchAll(/app\.use\("([^"]+)", (\w+)\);/g)) {
    const routeFile = imports.get(m[2]); if (!routeFile) continue;
    const routeSrc = fs.readFileSync(path.resolve(backendDir,routeFile),"utf8");
    const add = (method,suffix) => endpoints.push({method:method.toUpperCase(),path:m[1]+(suffix==="/"?"":suffix)});
    for (const x of routeSrc.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g)) add(x[1],x[2]);
    for (const b of routeSrc.matchAll(/router\.route\(['"]([^'"]+)['"]\)([^;]*);/g))
      for (const x of b[2].matchAll(/\.(get|post|put|patch|delete)\(/g)) add(x[1],b[1]);
  }
  return endpoints;
}
const endpoints = discoverEndpoints();
function endpointFor(method,url) {
  const pathname = url.split("?")[0];
  // Specific paths (saved, mine, dashboard-data) must win over /:id.
  return [...endpoints].sort((a,b)=>(a.path.includes(":")?1:0)-(b.path.includes(":")?1:0))
    .find(e=>e.method===method && new RegExp("^"+e.path.replace(/:[^/]+/g,"[^/]+")+"$").test(pathname));
}
async function http(method,url,options={}) {
  const headers={...options.headers};
  if (options.token) headers.Authorization="Bearer "+options.token;
  let body;
  if (options.form) body=options.form;
  else if (options.raw!==undefined) {body=options.raw; headers["Content-Type"]="application/json";}
  else if (options.body!==undefined) {body=JSON.stringify(options.body);headers["Content-Type"]="application/json";}
  const response=await nativeFetch(baseUrl+url,{method,headers,body,signal:AbortSignal.timeout(15000)});
  const text=await response.text();
  let json; try {json=JSON.parse(text);} catch {json={nonJson:text.slice(0,200)};}
  const ep=endpointFor(method,url);
  const trace={method,path:url,status:response.status,endpoint:ep?ep.method+" "+ep.path:null,
    message:json.message||json.return_message||null};
  requests.push(trace); if(current) current.requests.push(trace);
  return {status:response.status,body:json,headers:response.headers};
}
function status(response,expected) {
  assert.equal(response.status,expected,
    "HTTP mong đợi "+expected+", nhận "+response.status+": "+JSON.stringify(redact(response.body)));
  return response.body;
}
async function test(name,run,kind="contract") {
  const row={id:results.length+1,name,kind,status:"PASS",requests:[],durationMs:0};
  const start=Date.now();current=row;
  try {const evidence=await run();if(evidence!==undefined)row.evidence=redact(evidence);}
  catch(error) {row.status="FAIL";row.error=safeError(error);}
  finally {row.durationMs=Date.now()-start;results.push(row);current=null;}
  console.log(row.status+" "+row.id+" "+name+(row.error?" :: "+row.error.split("\n")[0]:""));
}
function requireState(...keys) {
  for(const key of keys) assert.ok(state[key],"Thiếu dữ liệu từ bước trước: "+key);
}
const admin = () => state.adminToken;
const customer = () => state.userToken;
const stranger = () => state.otherToken;
const future = days => new Date(Date.now()+days*86400000).toISOString();
const newId = () => String(new mongoose.Types.ObjectId());
const sources = () => [{title:"Nguồn DEMO cho kiểm thử, không phải thông tin du lịch",url:"https://example.com/api-test-demo",checkedAt:new Date().toISOString()}];
const destinationBody = (extra={}) => ({name:"API TEST DEMO "+runId,slug:"api-test-destination-"+runId,summary:"Dữ liệu demo.",
  description:"Chỉ phục vụ kiểm thử API.",category:"nature",sources:sources(),status:"published",...extra});
const articleBody = (extra={}) => ({title:"API TEST ARTICLE "+runId,slug:"api-test-article-"+runId,summary:"Bài demo.",
  content:"Nội dung giả lập.",category:"travel_tips",destinationIds:[state.destination],sources:sources(),status:"published",...extra});
const tourBody = (extra={}) => ({name:"API TEST TOUR "+runId,slug:"api-test-tour-"+runId,summary:"Tour demo.",
  description:"Không phải sản phẩm du lịch thật.",durationHours:4,themes:["nature"],destinationIds:[state.destination],
  itinerary:[{title:"Điểm dừng demo",description:"Hoạt động giả lập.",destinationId:state.destination}],
  meetingPoint:"Điểm hẹn demo",childPolicy:"Giá trẻ em theo chuyến demo.",cancellationPolicy:"Chính sách demo.",
  includes:["Dịch vụ demo"],excludes:[],status:"published",...extra});
const departureBody = (extra={}) => ({tourId:state.tour,departureAt:future(7),bookingDeadline:future(6),
  adultPrice:500000,childPrice:350000,maxGuestsPerBooking:10,status:"open",...extra});
const couponBody = (extra={}) => ({code:"TEST-"+runId.toUpperCase(),description:"Coupon demo.",
  discountType:"percentage",discountValue:10,maxDiscount:200000,minOrderValue:500000,
  validFrom:future(-1),validUntil:future(30),usageLimit:100,isActive:true,...extra});
async function getQuote(extra={}) {
  requireState("departure");
  return status(await http("POST","/api/bookings/quote",{body:{departureId:state.departure,adults:2,children:1,...extra}}),200);
}
function bookingBody(quote,extra={}) {
  return {quoteToken:quote.quoteToken,contact:{name:"Khách API Test",phone:"0900000001"},note:"API TEST "+runId,
    couponCode:quote.appliedCoupon||"",paymentMethod:"cash_on_arrival",...extra};
}
async function createBooking(extra={}) {
  const quote=await getQuote(extra.quote||{});
  const payload=bookingBody(quote,extra.body||{});
  const key=randomUUID();
  const response=await http("POST","/api/bookings",{token:customer(),body:payload,headers:{"Idempotency-Key":key}});
  const body=status(response,201);
  return {booking:body.data,quote,payload,key,response:body};
}
async function change(id,next,reason="Thao tác demo") {
  return http("PATCH","/api/bookings/"+id+"/status",{token:admin(),body:{status:next,reason}});
}
async function cancel(id,reason="Hủy dữ liệu demo",token=customer()) {
  return http("PATCH","/api/bookings/"+id+"/cancel",{token,body:{reason}});
}
function callbackBody(tx,extra={}) {
  const data=JSON.stringify({app_id:process.env.ZALOPAY_APP_ID,app_trans_id:tx.appTransId,amount:tx.amount,
    zp_trans_id:String(100000000000000+Number.parseInt(String(tx._id).slice(-8),16)),...extra});
  return {data,mac:createHmac("sha256",process.env.ZALOPAY_KEY2).update(data).digest("hex"),type:1};
}
async function webhook(tx,extra={}) {
  return http("POST","/api/payments/zalopay/webhook",{body:callbackBody(tx,extra)});
}
async function paymentFor(id) {
  const res=status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:id}}),200);
  const tx=await PaymentTransaction.findOne({appTransId:res.appTransId});
  assert.ok(tx); return tx;
}
function pngForm(size=0,mime="image/png",field="image") {
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFioAAAAASUVORK5CYII=","base64");
  const data=size?Buffer.alloc(size):png;
  const form=new FormData();form.append(field,new Blob([data],{type:mime}),mime==="image/png"?"api-test.png":"api-test.txt");return form;
}
function installExternalStubs() {
  globalThis.fetch=async (input,options={}) => {
    const url=String(input);
    if (!url.startsWith("https://graph.zalo.me/")) return nativeFetch(input,options);
    externalCalls.push({provider:"Zalo",mode:zaloMode,mocked:true});
    if(zaloMode==="network-error")throw new Error("SIMULATED_ZALO_NETWORK_ERROR");
    if(zaloMode==="invalid")return new Response(JSON.stringify({error:-1}),{status:401});
    if(zaloMode==="bad-id")return new Response(JSON.stringify({error:0,id:"not-numeric"}),{status:200});
    assert.equal(options.headers.appsecret_proof,
      createHmac("sha256",process.env.ZALO_APP_SECRET).update(options.headers.access_token).digest("hex"));
    return new Response(JSON.stringify({error:0,id:"999000000001",name:"Zalo Test Demo",
      picture:{data:{url:"https://example.com/demo-avatar.png"}}}),{status:200});
  };
  axios.post=async(url,data,options={})=>{
    const order=options.params;
    const base=process.env.ZALOPAY_ENDPOINT;
    if(url===new URL("query",base).href){
      externalCalls.push({provider:"ZaloPay Query",mode:queryMode,mocked:true});
      assert.equal(order.mac,createHmac("sha256",process.env.ZALOPAY_KEY1).update([order.app_id,order.app_trans_id,process.env.ZALOPAY_KEY1].join("|")).digest("hex"));
      if(queryMode==="network-error")throw new Error("SIMULATED_QUERY_NETWORK_ERROR");
      return {data:providerOrders.get(order.app_trans_id)||{return_code:2,sub_return_code:-101,is_processing:false}};
    }
    if(url===new URL("refund",base).href){
      externalCalls.push({provider:"ZaloPay Refund",mode:refundMode,mocked:true});
      assert.equal(order.mac,createHmac("sha256",process.env.ZALOPAY_KEY1).update([order.app_id,order.zp_trans_id,order.amount,order.description,order.timestamp].join("|")).digest("hex"));
      assert.match(order.m_refund_id,new RegExp("^\\d{6}_"+process.env.ZALOPAY_APP_ID+"_"));
      assert.ok(order.m_refund_id.length<=45);
      if(refundMode==="network-error")throw new Error("SIMULATED_REFUND_NETWORK_ERROR");
      if(refundMode==="rejected")return {data:{return_code:2,sub_return_code:-13}};
      return {data:{return_code:3,refund_id:"900000001"}};
    }
    if(url===new URL("query_refund",base).href){
      externalCalls.push({provider:"ZaloPay Query Refund",mode:refundQueryMode,mocked:true});
      assert.equal(order.mac,createHmac("sha256",process.env.ZALOPAY_KEY1).update([order.app_id,order.m_refund_id,order.timestamp].join("|")).digest("hex"));
      if(refundQueryMode==="network-error")throw new Error("SIMULATED_REFUND_QUERY_NETWORK_ERROR");
      return {data:{return_code:refundQueryMode==="success"?1:3}};
    }
    assert.equal(url,base,"Unexpected external HTTP target");
    externalCalls.push({provider:"ZaloPay",mode:paymentMode,mocked:true});
    providerOrders.set(order.app_trans_id,{return_code:3,is_processing:true});
    if(paymentMode==="network-error")throw new Error("SIMULATED_ZALOPAY_NETWORK_ERROR");
    if(paymentMode==="rejected")return {data:{return_code:2,sub_return_code:-1,return_message:"SIMULATED_REJECTION"}};
    const signature=[order.app_id,order.app_trans_id,order.app_user,order.amount,order.app_time,order.embed_data,order.item].join("|");
    assert.equal(order.mac,createHmac("sha256",process.env.ZALOPAY_KEY1).update(signature).digest("hex"));
    return {data:{return_code:1,order_url:"https://example.invalid/sandbox-order/"+order.app_trans_id,zp_trans_token:"simulated-token"}};
  };
  cloudinary.uploader.upload=async(data,options)=>{
    externalCalls.push({provider:"Cloudinary",mode:uploadMode,mocked:true});
    if(uploadMode==="error")throw new Error("SIMULATED_CLOUDINARY_ERROR");
    assert.match(data,/^data:image\/png;base64,/);assert.equal(options.folder,"vna-daksong");
    return {secure_url:"https://example.invalid/api-test.png",public_id:"api-test/demo"};
  };
}
function writeReport() {
  const coverage=endpoints.map(ep=>{
    const key=ep.method+" "+ep.path;const hits=requests.filter(r=>r.endpoint===key);
    const cases=results.filter(r=>r.requests.some(q=>q.endpoint===key));
    return {...ep,requests:hits.length,successResponses:hits.filter(r=>r.status>=200&&r.status<300).length,
      passCases:cases.filter(c=>c.status==="PASS").length,failCases:cases.filter(c=>c.status==="FAIL").length,
      externalMocked:/\/auth\/zalo$|\/payments\/zalopay\/|\/upload$/.test(ep.path)};
  });
  const summary={total:results.length,passed:results.filter(r=>r.status==="PASS").length,
    failed:results.filter(r=>r.status==="FAIL").length,coveredEndpoints:coverage.filter(e=>e.requests>0).length,
    totalEndpoints:endpoints.length,coveredApiEndpoints:coverage.filter(e=>e.path!=="/"&&e.requests>0).length,
    totalApiEndpoints:endpoints.filter(e=>e.path!=="/").length,httpRequests:requests.length};
  const snapshot=fs.readdirSync(path.join(backendDir,"controllers")).filter(n=>n.endsWith(".js")).map(name=>({
    file:"backend/controllers/"+name,sha256:createHash("sha256").update(fs.readFileSync(path.join(backendDir,"controllers",name))).digest("hex")
  }));
  const report={startedAt:startedAt.toISOString(),finishedAt:new Date().toISOString(),runId,
    mode:"Actual server.js, real local HTTP, isolated MongoDB database, simulated external providers",
    databaseName,dbConnected:ready,temporaryDatabaseDropped:dbDropped,summary,
    infrastructureError:fatalError?safeError(fatalError):null,
    notVerified:["Zalo thật với access token người dùng","Thanh toán/callback ZaloPay sandbox thật","Upload vào Cloudinary thật",
      "Mọi tổ hợp dữ liệu và mọi lịch thực thi đồng thời; endpoint coverage không phải exhaustive path coverage"],
    coverage,results,externalCalls,snapshot};
  fs.mkdirSync(path.dirname(outJson),{recursive:true});
  fs.writeFileSync(outJson,JSON.stringify(report,null,2)+"\n");
  const escape=s=>String(s??"").replaceAll("|","\\|").replaceAll("\n"," ");
  const lines=["**Kết quả kiểm thử toàn bộ API backend**","",
    "Thời gian: "+report.startedAt+" → "+report.finishedAt+". Lượt chạy: "+runId+".","",
    "**Kết quả:** "+summary.passed+" đạt, "+summary.failed+" lỗi / "+summary.total+" ca; "+
      summary.coveredApiEndpoints+"/"+summary.totalApiEndpoints+" API và GET / đã được gọi qua HTTP thật.","",
    "**Phạm vi:** chạy server.js cùng routes/controllers/middleware thật, MongoDB thật trong database test riêng. "+
      "Zalo, ZaloPay và Cloudinary được giả lập tại ranh giới dịch vụ ngoài. Không sửa .env hoặc dữ liệu ứng dụng.","",
    "Database test: "+databaseName+". Kết nối: "+(ready?"thành công":"chưa thành công")+
      ". Dọn database test: "+(dbDropped?"đã xóa database do lượt test tạo":"chưa xác nhận")+".","",
    "Chạy lại từ thư mục backend: §npm.cmd run test:api§. File test: "+
      "[all-api.test.mjs](<../tests/all-api.test.mjs>). JSON đầy đủ: "+
      "[all-api-results.json](<all-api-results.json>).",""];
  if(fatalError)lines.push("**Lỗi hạ tầng:** "+escape(safeError(fatalError)),"");
  lines.push("**Các ca thất bại**","","| STT | Ca | Chi tiết |","| --- | --- | --- |");
  for(const r of results.filter(r=>r.status==="FAIL"))lines.push("| "+r.id+" | "+escape(r.name)+" | "+escape(r.error)+" |");
  if(!summary.failed)lines.push("| — | Không có ca thất bại đã ghi nhận | Các giới hạn tích hợp vẫn áp dụng |");
  lines.push("","**Độ bao phủ endpoint**","","| Method | Path | Số request | Response 2xx | Ca đạt/lỗi | Dịch vụ ngoài |",
    "| --- | --- | --- | --- | --- | --- |");
  for(const e of coverage)lines.push("| "+e.method+" | "+e.path+" | "+e.requests+" | "+e.successResponses+
    " | "+e.passCases+"/"+e.failCases+" | "+(e.externalMocked?"Giả lập provider":"—")+" |");
  lines.push("","**Toàn bộ ca kiểm thử**","","| STT | Kết quả | Ca | Loại | Bằng chứng/lỗi |","| --- | --- | --- | --- | --- |");
  for(const r of results)lines.push("| "+r.id+" | "+r.status+" | "+escape(r.name)+" | "+r.kind+" | "+
    escape(r.error|| (r.evidence?JSON.stringify(r.evidence):r.requests.map(q=>q.method+" "+q.path+" → "+q.status).join("; ")))+" |");
  lines.push("","**Giới hạn**","",
    "Bao phủ tất cả endpoint không đồng nghĩa đã kiểm tra mọi nhánh, mọi payload hay tích hợp nhà cung cấp thật. "+
    "Các ca fault-injection cố tình gây lỗi lưu DB/provider để kiểm tra khả năng khôi phục; không mô tả một sự cố sản xuất đã xảy ra.","",
    ...report.notVerified.map(x=>"- Chưa xác minh: "+x+"."));
  fs.writeFileSync(outMd,lines.join("\n").replaceAll("§","¤").replaceAll("¤",String.fromCharCode(96))+"\n");
  reportWritten=true; return summary;
}
process.on("exit",()=>{if(!reportWritten)try{writeReport();}catch{}});
installExternalStubs();
Object.assign(process.env,localEnv,{
  NODE_ENV:"test",ALLOW_MOCK_LOGIN:"true",PORT:"0",JWT_SECRET:sessionSecret,
  ZALO_APP_SECRET:"isolated-zalo-secret",ZALOPAY_APP_ID:"999999",
  ZALOPAY_KEY1:"isolated-zalopay-key1",ZALOPAY_KEY2:"isolated-zalopay-key2",
  ZALOPAY_ENDPOINT:"https://example.invalid/zalopay",CLIENT_URL:"https://example.invalid/client"
});
mongoose.connect=function(uri,options={}){return originalConnect.call(this,uri,{...options,dbName:databaseName,serverSelectionTimeoutMS:10000});};
express.application.listen=function(...args){server=originalListen.apply(this,args);return server;};
const connectDeadline=setTimeout(()=>{
  fatalError=new Error("MongoDB test connection exceeded 30 seconds (possible network/DNS restriction).");
  writeReport();process.exit(2);
},30000);

try {
  if(!localEnv.MONGO_URI)throw new Error("Thiếu MONGO_URI trong backend/.env.");
  await import("../server.js");
  if(!server.listening)await once(server,"listening");
  baseUrl="http://127.0.0.1:"+server.address().port;
  await mongoose.connection.asPromise();clearTimeout(connectDeadline);ready=true;
  assert.equal(mongoose.connection.name,databaseName);
  await Promise.all(models.map(m=>m.init()));
  const adminUser=await User.create({name:"API Test Admin",email:"api-test-admin@example.test",
    password:await bcrypt.hash(adminPassword,10),role:"admin",active:true});
  state.adminId=String(adminUser._id);
  await runTests();
} catch(error) {
  fatalError=error; console.error("TEST INFRASTRUCTURE: "+safeError(error));
} finally {
  clearTimeout(connectDeadline);
  if(ready){
    try {
      assert.equal(mongoose.connection.name,databaseName);
      assert.match(databaseName,/^vna_api_test_\d+_[a-f0-9]{8}$/);
      await mongoose.connection.dropDatabase();dbDropped=true;
    } catch(error){fatalError ||= error;}
  }
  if(server)await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect();
  globalThis.fetch=nativeFetch;axios.post=originalAxiosPost;cloudinary.uploader.upload=originalUpload;
  express.application.listen=originalListen;mongoose.connect=originalConnect;
  const summary=writeReport();
  console.log("SUMMARY "+JSON.stringify(summary));
  process.exitCode=fatalError?2:summary.failed||summary.coveredEndpoints!==summary.totalEndpoints?1:0;
}

async function runPaymentTests() {
  await test("ZaloPay chặn khách thanh toán đơn người khác",async()=>status(await http("POST","/api/payments/zalopay/create",{token:stranger(),body:{bookingId:state.bookingA.booking._id}}),403));
  await test("ZaloPay chặn đơn đã cancelled",async()=>status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:state.bookingB.booking._id}}),400));
  await test("ZaloPay booking không tồn tại trả 404",async()=>status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:newId()}}),404));
  await test("ZaloPay thiếu cấu hình trả 503",async()=>{
    const key=process.env.ZALOPAY_KEY1;delete process.env.ZALOPAY_KEY1;
    try{status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:state.bookingA.booking._id}}),503);}
    finally{process.env.ZALOPAY_KEY1=key;}
  });
  await test("ZaloPay tạo giao dịch, xác minh MAC gửi provider",async()=>{
    state.bookingD=await createBooking({body:{paymentMethod:"zalopay"}});state.txD=await paymentFor(state.bookingD.booking._id);
    assert.equal(state.txD.status,"pending");assert.equal(state.txD.amount,1350000);
    assert.equal((await Booking.findById(state.bookingD.booking._id)).paymentStatus,"unpaid");
  },"external-mocked");
  await test("ZaloPay chặn tạo tiếp khi đã pending",async()=>status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:state.bookingD.booking._id}}),409));
  await test("Webhook sai MAC trả return_code -1",async()=>{
    assert.equal(status(await http("POST","/api/payments/zalopay/webhook",{body:{data:"{}",mac:"invalid",type:1}}),200).return_code,-1);
  });
  await test("Webhook đúng MAC nhưng sai app_id bị chặn",async()=>assert.equal(status(await webhook(state.txD,{app_id:"wrong-app"}),200).return_code,-1));
  await test("Webhook transaction không tồn tại bị chặn",async()=>assert.equal(status(await webhook({appTransId:"NON-EXISTENT-"+runId,amount:1350000}),200).return_code,-1));
  await test("Webhook đúng chữ ký: paid, không tự confirmed",async()=>{
    assert.equal(status(await webhook(state.txD),200).return_code,1);
    const b=status(await http("GET","/api/bookings/"+state.bookingD.booking._id,{token:customer()}),200).data;
    assert.equal(b.paymentStatus,"paid");assert.equal(b.status,"pending_confirmation");assert.equal(b.paymentMethod,"zalopay");
    assert.equal((await PaymentTransaction.findById(state.txD._id)).status,"success");
  });
  await test("Webhook success replay không lặp payment_received",async()=>{
    const count=await Booking.findById(state.bookingD.booking._id);const before=count.history.length;
    assert.equal(status(await webhook(state.txD),200).return_code,1);assert.equal((await Booking.findById(count._id)).history.length,before);
  });
  await test("Không tạo giao dịch cho đơn đã paid",async()=>status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:state.bookingD.booking._id}}),400));
  await test("Hủy đơn paid chuyển Booking refund_pending",async()=>{
    const b=status(await cancel(state.bookingD.booking._id),200).data;assert.equal(b.status,"cancelled");assert.equal(b.paymentStatus,"refund_pending");
  });
  await test("Tiền về sau khi hủy: không mở lại booking",async()=>{
    const b=await createBooking();state.lateBooking=b.booking;state.lateTx=await paymentFor(b.booking._id);
    status(await cancel(b.booking._id),200);assert.equal(status(await webhook(state.lateTx),200).return_code,1);
    const saved=await Booking.findById(b.booking._id);assert.equal(saved.status,"cancelled");assert.equal(saved.paymentStatus,"refund_pending");
    assert.equal((await PaymentTransaction.findById(state.lateTx._id)).status,"refund_pending");
  });
  await test("Webhook sai amount bị từ chối",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    assert.equal(status(await webhook(tx,{amount:tx.amount+1}),200).return_code,-1);
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"failed");assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"unpaid");
  });
  await test("Provider từ chối: API 400 và transaction failed",async()=>{
    const b=await createBooking();paymentMode="rejected";
    try{status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}}),400);
      assert.equal((await PaymentTransaction.findOne({bookingId:b.booking._id})).status,"failed");}
    finally{paymentMode="success";}
  },"external-mocked");
}

async function runUploadTests() {
  await test("Admin upload ảnh thành công qua Cloudinary giả lập",async()=>{
    const b=status(await http("POST","/api/upload",{token:admin(),form:pngForm()}),200);assert.match(b.url,/^https:\/\//);assert.equal(b.public_id,"api-test/demo");
  },"external-mocked");
  await test("Upload không file trả 400",async()=>status(await http("POST","/api/upload",{token:admin(),form:new FormData()}),400));
  await test("Upload chặn khách",async()=>status(await http("POST","/api/upload",{token:customer(),form:pngForm()}),403));
  await test("Upload không đăng nhập trả 401",async()=>status(await http("POST","/api/upload",{form:pngForm()}),401));
  await test("Cloudinary lỗi trả 500 có kiểm soát",async()=>{
    uploadMode="error";try{status(await http("POST","/api/upload",{token:admin(),form:pngForm()}),500);}finally{uploadMode="success";}
  },"external-mocked");
}

async function runRegressionTests() {
  await test("Đầu vào sai: Destination.address object phải trả 400",async()=>{
    status(await http("POST","/api/destinations",{token:admin(),body:destinationBody({slug:"bad-address-"+runId,address:{bad:true}})}),400);
  },"regression");
  await test("Đầu vào sai: Tour.childPolicy object phải trả 400",async()=>{
    status(await http("POST","/api/tours",{token:admin(),body:tourBody({slug:"bad-policy-"+runId,childPolicy:{bad:true}})}),400);
  },"regression");
  await test("Đầu vào sai: bookingId ZaloPay phải trả 400",async()=>{
    status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:"bad-id"}}),400);
  },"regression");
  await test("File không phải ảnh phải trả 400",async()=>{
    status(await http("POST","/api/upload",{token:admin(),form:pngForm(10,"text/plain")}),400);
  },"regression");
  await test("File lớn hơn 5MB phải trả 413",async()=>{
    status(await http("POST","/api/upload",{token:admin(),form:pngForm(5*1024*1024+1)}),413);
  },"regression");
  await test("Sai field upload phải trả 400",async()=>{
    status(await http("POST","/api/upload",{token:admin(),form:pngForm(0,"image/png","wrong-field")}),400);
  },"regression");
  await test("Coupon validUntil trước validFrom phải bị từ chối",async()=>{
    status(await http("POST","/api/coupons",{token:admin(),body:couponBody({code:"BAD-DATES-"+runId,validFrom:future(5),validUntil:future(1)})}),400);
  },"regression");
  await test("Coupon isActive chuỗi false không được bật mã",async()=>{
    const c=await Coupon.create(couponBody({code:"BOOLEAN-"+runId,isActive:false}));
    const r=await http("PUT","/api/coupons/"+c._id,{token:admin(),body:{isActive:"false"}});
    if(r.status!==400){status(r,200);assert.equal(r.body.data.isActive,false,"Chuỗi false bị chuyển thành true");}
  },"regression");
  await test("Reason sai kiểu ở confirmed phải trả 400",async()=>{
    const b=await createBooking();status(await http("PATCH","/api/bookings/"+b.booking._id+"/status",{token:admin(),body:{status:"confirmed",reason:{bad:true}}}),400);
  },"regression");
  await test("Thanh toán + confirm chỉ tăng soldCount một lần",async()=>{
    const before=(await Tour.findById(state.tour)).soldCount;const b=await createBooking();const tx=await paymentFor(b.booking._id);
    assert.equal(status(await webhook(tx),200).return_code,1);status(await change(b.booking._id,"confirmed"),200);
    const delta=(await Tour.findById(state.tour)).soldCount-before;assert.equal(delta,3,"Một booking 3 khách bị cộng soldCount "+delta);
  },"regression");
  await test("Hủy booking paid đồng bộ PaymentTransaction refund_pending",async()=>{
    const tx=await PaymentTransaction.findById(state.txD._id);assert.equal(tx.status,"refund_pending","Booking đã refund_pending nhưng transaction vẫn "+tx.status);
  },"regression");
  await test("Callback refund_pending gửi lại không thêm lịch sử trùng",async()=>{
    const b=await Booking.findById(state.lateBooking._id);const before=b.history.filter(h=>h.status==="refund_pending").length;
    assert.equal(status(await webhook(state.lateTx),200).return_code,1);
    const after=(await Booking.findById(b._id)).history.filter(h=>h.status==="refund_pending").length;
    assert.equal(after,before,"Callback tiền về muộn bị ghi lặp history");
  },"regression");
  await test("Webhook retry khôi phục booking nếu save lỗi lần đầu",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);const original=Booking.prototype.save;let injected=false;
    Booking.prototype.save=function(...args){
      if(String(this._id)===b.booking._id&&!injected){injected=true;return Promise.reject(new Error("SIMULATED_BOOKING_SAVE_FAILURE"));}
      return original.apply(this,args);
    };
    try{assert.equal(status(await webhook(tx),200).return_code,0);
      assert.equal((await PaymentTransaction.findById(tx._id)).status,"pending","Lỗi Booking.save phải rollback cả transaction");}
    finally{Booking.prototype.save=original;}
    assert.equal(status(await webhook(tx),200).return_code,1);
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid","Transaction success nhưng booking vẫn unpaid sau retry");
  },"fault-injection");
  await test("Mất mạng giữ claim; đối soát được tiền đã thu mà không tạo giao dịch mới",async()=>{
    const b=await createBooking();paymentMode="network-error";
    let result;
    try{result=status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}}),502);}
    finally{paymentMode="success";}
    const tx=await PaymentTransaction.findOne({bookingId:b.booking._id});
    assert.equal(tx.status,"pending");assert.equal(tx.activeAttempt,true);assert.equal(result.appTransId,tx.appTransId);
    status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}}),409);
    providerOrders.set(tx.appTransId,{return_code:1,amount:tx.amount,zp_trans_id:"900001"});
    status(await http("POST","/api/payments/zalopay/"+tx.appTransId+"/query",{token:customer()}),200);
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid");
    assert.equal(await PaymentTransaction.countDocuments({bookingId:b.booking._id}),1);
  },"fault-injection");
  await test("Hai request hủy đồng thời không làm quota coupon âm",async()=>{
    const b=await createBooking({quote:{couponCode:state.couponCode}});const original=Coupon.findOneAndUpdate;
    let arrivals=0,release;const gate=new Promise(resolve=>{release=resolve;});
    const timer=setTimeout(release,3000);
    Coupon.findOneAndUpdate=async function(filter,update,...args){
      if(filter.code===state.couponCode&&update.$inc?.usedCount===-1){arrivals++;if(arrivals>=2)release();await gate;}
      return original.call(this,filter,update,...args);
    };
    let all;try{all=await Promise.all([cancel(b.booking._id),cancel(b.booking._id)]);}
    finally{clearTimeout(timer);Coupon.findOneAndUpdate=original;}
    assert.deepEqual(all.map(r=>r.status).sort(),[200,409]);
    assert.equal((await Coupon.findById(state.coupon)).usedCount,0,"Quota bị trừ bởi request hủy không thắng cập nhật booking");
  },"concurrency");
}

async function runPaymentRecoveryTests() {
  const query = (tx, token=customer()) => http("POST","/api/payments/zalopay/"+tx.appTransId+"/query",{token});
  const refund = (tx, token=admin()) => http("POST","/api/payments/zalopay/"+tx.appTransId+"/refund",{token});
  const queryRefund = (tx, token=admin()) => http("POST","/api/payments/zalopay/"+tx.appTransId+"/refund/query",{token});
  await test("Xóa rồi tạo lại cùng mã coupon: hủy đơn cũ không trừ quota mã mới",async()=>{
    const body=couponBody({code:"RECREATED-"+runId});
    const old=status(await http("POST","/api/coupons",{token:admin(),body}),201).data;
    const b=await createBooking({quote:{couponCode:body.code}});
    status(await http("DELETE","/api/coupons/"+old._id,{token:admin()}),200);
    const recreated=status(await http("POST","/api/coupons",{token:admin(),body}),201).data;
    await Coupon.updateOne({_id:recreated._id},{$set:{usedCount:5}});
    status(await cancel(b.booking._id),200);
    assert.equal((await Coupon.findById(recreated._id)).usedCount,5);
  },"regression");
  await test("Năm yêu cầu tạo thanh toán đồng thời chỉ tạo một giao dịch",async()=>{
    const b=await createBooking();
    const all=await Promise.all(Array.from({length:5},()=>http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}})));
    assert.deepEqual(all.map(r=>r.status).sort(),[200,409,409,409,409]);
    assert.equal(await PaymentTransaction.countDocuments({bookingId:b.booking._id}),1);
  },"concurrency");
  await test("Năm callback đồng thời chỉ ghi nhận tiền một lần",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    const all=await Promise.all(Array.from({length:5},()=>webhook(tx)));
    assert.ok(all.every(r=>r.status===200&&r.body.return_code===1));
    const booking=await Booking.findById(b.booking._id);
    assert.equal(booking.paymentStatus,"paid");assert.equal(booking.history.filter(h=>h.status==="payment_received").length,1);
  },"concurrency");
  await test("Hủy và callback đồng thời đồng bộ trạng thái cần hoàn tiền",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    const [cancelled,paid]=await Promise.all([cancel(b.booking._id),webhook(tx)]);
    status(cancelled,200);assert.equal(status(paid,200).return_code,1);
    const saved=await Booking.findById(b.booking._id);
    assert.equal(saved.status,"cancelled");assert.equal(saved.paymentStatus,"refund_pending");
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refund_pending");
  },"concurrency");
  await test("Query chặn người không phải chủ đơn; admin được đối soát",async()=>{
    const tx=state.lateTx;
    status(await query(tx,stranger()),403);status(await query(tx,null),401);status(await query(tx,admin()),200);
  });
  await test("Callback sai amount sau success không được hạ trạng thái",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    assert.equal(status(await webhook(tx),200).return_code,1);
    assert.equal(status(await webhook(tx,{amount:tx.amount+1}),200).return_code,-1);
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"success");
  },"regression");
  await test("Query sai amount không đánh dấu booking paid",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    providerOrders.set(tx.appTransId,{return_code:1,amount:tx.amount+100,zp_trans_id:"90000003"});
    status(await query(tx),502);assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"unpaid");
  });
  await test("Giao dịch pending hết hạn được query rồi cho thanh toán lại",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    await PaymentTransaction.updateOne({_id:tx._id},{$set:{expiresAt:new Date(Date.now()-1000)}});
    providerOrders.set(tx.appTransId,{return_code:2,sub_return_code:-101,is_processing:false});
    assert.equal(status(await query(tx),200).status,"failed");
    const next=await paymentFor(b.booking._id);assert.notEqual(next.appTransId,tx.appTransId);
  });
  await test("Query lỗi MAC/hệ thống không tự giải phóng giao dịch cũ",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    await PaymentTransaction.updateOne({_id:tx._id},{$set:{expiresAt:new Date(Date.now()-1000)}});
    providerOrders.set(tx.appTransId,{return_code:2,sub_return_code:-53,is_processing:false});
    assert.equal(status(await query(tx),200).status,"pending");
    status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}}),409);
  });
  await test("Query mất mạng không thay đổi kết quả đã lưu",async()=>{
    queryMode="network-error";
    try{status(await query(state.lateTx),502);}finally{queryMode="normal";}
    assert.equal((await PaymentTransaction.findById(state.lateTx._id)).status,"refund_pending");
  },"fault-injection");
  await test("Legacy transaction success nhưng booking unpaid được callback sửa lại",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    await PaymentTransaction.updateOne({_id:tx._id},{$set:{status:"success",appliedAt:null}});
    assert.equal(status(await webhook(tx),200).return_code,1);
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid");
  },"regression");
  await test("Legacy success/unpaid không được tạo thêm giao dịch",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    await PaymentTransaction.updateOne({_id:tx._id},{$set:{status:"success",appliedAt:null,activeAttempt:false}});
    providerOrders.set(tx.appTransId,{return_code:1,amount:tx.amount,zp_trans_id:"90000004"});
    status(await http("POST","/api/payments/zalopay/create",{token:customer(),body:{bookingId:b.booking._id}}),400);
    assert.equal(await PaymentTransaction.countDocuments({bookingId:b.booking._id}),1);
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid");
  },"regression");
  await test("Admin đọc booking lấy được mã giao dịch để xử lý hoàn tiền",async()=>{
    const body=status(await http("GET","/api/bookings/"+state.lateTx.bookingId,{token:admin()}),200);
    assert.ok(body.payments.some(tx=>tx.appTransId===state.lateTx.appTransId));
    assert.ok(body.payments.every(tx=>!("rawCallback" in tx)));
  });
  await test("Refund chỉ dành cho admin và đơn cần hoàn tiền",async()=>{
    status(await refund(state.lateTx,customer()),403);status(await queryRefund(state.lateTx,customer()),403);
    status(await refund(state.lateTx,null),401);
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    status(await refund(tx),409);status(await queryRefund(tx),409);
  });
  await test("Admin gửi refund không báo refunded trước khi provider xác nhận",async()=>{
    const tx=state.lateTx;status(await refund(tx),202);
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refund_pending");
    assert.equal((await Booking.findById(tx.bookingId)).paymentStatus,"refund_pending");
    status(await refund(tx),409);status(await queryRefund(tx),200);
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refund_pending");
  },"external-mocked");
  await test("Query refund thành công đồng bộ hai model, replay không lặp lịch sử",async()=>{
    refundQueryMode="success";
    try{
      assert.equal(status(await queryRefund(state.lateTx),200).status,"refunded");
      const booking=await Booking.findById(state.lateTx.bookingId);
      assert.equal(booking.paymentStatus,"refunded");const count=booking.history.length;
      status(await queryRefund(state.lateTx),200);
      assert.equal(status(await webhook(state.lateTx),200).return_code,1);
      assert.equal((await Booking.findById(booking._id)).history.length,count);
      assert.equal((await PaymentTransaction.findById(state.lateTx._id)).status,"refunded");
    }finally{refundQueryMode="processing";}
  },"external-mocked");
  await test("Refund mất mạng giữ cùng request ID, không gửi thêm lệnh hoàn tiền",async()=>{
    const b=await createBooking();const tx=await paymentFor(b.booking._id);
    assert.equal(status(await webhook(tx),200).return_code,1);status(await cancel(b.booking._id),200);
    refundMode="network-error";
    try{status(await refund(tx),502);}finally{refundMode="processing";}
    const saved=await PaymentTransaction.findById(tx._id);assert.ok(saved.refundRequestId);
    const calls=externalCalls.filter(x=>x.provider==="ZaloPay Refund").length;
    status(await refund(tx),409);
    assert.equal(externalCalls.filter(x=>x.provider==="ZaloPay Refund").length,calls);
    assert.equal((await PaymentTransaction.findById(tx._id)).refundRequestId,saved.refundRequestId);
    refundQueryMode="success";
    try{assert.equal(status(await queryRefund(tx),200).status,"refunded");}finally{refundQueryMode="processing";}
  },"fault-injection");
  await test("Hai request refund đồng thời chỉ gửi một lệnh tới provider",async()=>{
    const calls=externalCalls.filter(x=>x.provider==="ZaloPay Refund").length;
    const all=await Promise.all([refund(state.txD),refund(state.txD)]);
    assert.deepEqual(all.map(r=>r.status).sort(),[202,409]);
    assert.equal(externalCalls.filter(x=>x.provider==="ZaloPay Refund").length,calls+1);
  },"concurrency");
  await test("Query refund lỗi lưu booking rollback cả transaction",async()=>{
    const tx=state.txD;const original=Booking.prototype.save;
    Booking.prototype.save=function(...args){if(String(this._id)===String(tx.bookingId))return Promise.reject(new Error("SIMULATED_REFUND_SAVE_FAILURE"));return original.apply(this,args);};
    refundQueryMode="success";
    try{status(await queryRefund(tx),500);}finally{Booking.prototype.save=original;refundQueryMode="processing";}
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refund_pending");
    assert.equal((await Booking.findById(tx.bookingId)).paymentStatus,"refund_pending");
    refundQueryMode="success";
    try{status(await queryRefund(tx),200);}finally{refundQueryMode="processing";}
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refunded");
  },"fault-injection");
  await test("Tiền mới về sau khi đã refund phải chuyển lại refund_pending",async()=>{
    const tx=await PaymentTransaction.create({bookingId:state.lateTx.bookingId,bookingCode:state.lateTx.bookingCode,
      appTransId:"LEGACY-LATE-"+runId,amount:state.lateTx.amount,provider:"zalopay",status:"pending"});
    assert.equal(status(await webhook(tx),200).return_code,1);
    assert.equal((await Booking.findById(tx.bookingId)).paymentStatus,"refund_pending");
    assert.equal((await PaymentTransaction.findById(tx._id)).status,"refund_pending");
  },"regression");
  await test("Hai giao dịch nhận tiền: giao dịch thứ hai cần refund, đơn vẫn paid",async()=>{
    const b=await createBooking();const first=await paymentFor(b.booking._id);
    const second=await PaymentTransaction.create({bookingId:b.booking._id,bookingCode:b.booking.code,
      appTransId:"LEGACY-DUP-"+runId,amount:first.amount,provider:"zalopay",status:"pending"});
    assert.equal(status(await webhook(first),200).return_code,1);
    assert.equal(status(await webhook(second),200).return_code,1);
    assert.equal((await PaymentTransaction.findById(second._id)).status,"refund_pending");
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid");
    status(await refund(second),202);refundQueryMode="success";
    try{status(await queryRefund(second),200);}finally{refundQueryMode="processing";}
    assert.equal((await Booking.findById(b.booking._id)).paymentStatus,"paid");
    assert.equal((await PaymentTransaction.findById(first._id)).status,"success");
  },"regression");
  await test("Lỗi lưu điểm rollback completed và retry cộng đúng một lần",async()=>{
    const template=await Booking.findById(state.bookingA.booking._id).lean();
    delete template._id;delete template.__v;
    const fixture=await Booking.create({...template,code:"VNA-ROLLBACK-"+randomBytes(5).toString("hex"),idempotencyKey:randomUUID(),requestHash:"fixture",
      status:"confirmed",paymentStatus:"paid",snapshot:{...template.snapshot,departureAt:new Date(Date.now()-8*3600000),durationHours:4}});
    const points=(await User.findById(state.userId)).loyaltyPoints;const original=User.prototype.save;
    User.prototype.save=function(...args){if(String(this._id)===state.userId)return Promise.reject(new Error("SIMULATED_LOYALTY_SAVE_FAILURE"));return original.apply(this,args);};
    try{status(await change(String(fixture._id),"completed"),500);}finally{User.prototype.save=original;}
    assert.equal((await Booking.findById(fixture._id)).status,"confirmed");
    assert.equal((await User.findById(state.userId)).loyaltyPoints,points);
    status(await change(String(fixture._id),"completed"),200);
    assert.equal((await User.findById(state.userId)).loyaltyPoints,points+135);
  },"fault-injection");
}

async function runReviewTests() {
  const reviewPath = "/api/tours/" + state.tour + "/reviews";
  let ownBooking, secondBooking, otherBooking, reviewId, secondReviewId, otherReviewId;
  await test("Đánh giá: tour chưa có đánh giá trả trung bình null, số lượng 0", async () => {
    const body = status(await http("GET", reviewPath), 200);
    assert.equal(body.summary.averageRating, null); assert.equal(body.summary.reviewCount, 0);
    assert.deepEqual(body.summary.distribution, {1:0,2:0,3:0,4:0,5:0}); assert.deepEqual(body.data, []);
  });
  await test("Đánh giá: chuẩn bị đơn hoàn thành trong database test riêng", async () => {
    ownBooking = await Booking.findOne({ userId: state.userId, tourId: state.tour, status: "completed" });
    assert.ok(ownBooking, "Cần đơn hoàn thành từ kiểm thử booking");
    const template = ownBooking.toObject(); delete template._id; delete template.__v;
    secondBooking = await Booking.create({...template, code:"VNA-REVIEW-"+randomUUID(), idempotencyKey:randomUUID(), requestHash:"review-fixture"});
    otherBooking = await Booking.create({...template, userId:state.otherId, code:"VNA-REVIEW-OTHER-"+randomUUID(), idempotencyKey:randomUUID(), requestHash:"review-fixture"});
  });
  await test("Đánh giá: cần đăng nhập khi tạo và xem quyền đánh giá", async () => {
    status(await http("POST", reviewPath, {body:{}}), 401);
    status(await http("GET", reviewPath + "/eligibility"), 401);
  });
  await test("Đánh giá: token sai không được bỏ qua trên API công khai", async () => status(await http("GET", reviewPath, {token:"bad-token"}), 401));
  await test("Đánh giá: ID tour sai, không tồn tại và phân trang sai", async () => {
    status(await http("GET", "/api/tours/bad-id/reviews"), 400);
    status(await http("GET", "/api/tours/"+newId()+"/reviews"), 404);
    for (const query of ["page=0", "page=NaN", "limit=Infinity", "limit=1.5", "limit=bad", "page=1&page=2"]) status(await http("GET", reviewPath+"?"+query), 400);
  });
  await test("Đánh giá: quyền đánh giá chỉ có đơn hoàn thành của chính mình", async () => {
    const body = status(await http("GET", reviewPath+"/eligibility", {token:customer()}), 200);
    assert.ok(body.eligibleBookings.some(b=>b._id===String(ownBooking._id)));
    assert.ok(!body.eligibleBookings.some(b=>b._id===String(otherBooking._id)));
    assert.deepEqual(body.myReviews, []);
  });
  await test("Đánh giá: chặn đơn chưa hoàn thành và đơn của người khác", async () => {
    for (const bookingId of [state.bookingA.booking._id, state.bookingB.booking._id, String(otherBooking._id), newId()]) {
      status(await http("POST", reviewPath, {token:customer(),body:{bookingId,rating:5,comment:"Tour tốt"}}), 403);
    }
  });
  await test("Đánh giá: đơn hoàn thành phải thuộc đúng tour", async () => {
    const anotherTour = await Tour.create(tourBody({slug:"review-other-tour-"+runId}));
    status(await http("POST", "/api/tours/"+anotherTour._id+"/reviews", {token:customer(),body:{bookingId:String(ownBooking._id),rating:5,comment:"Tour tốt"}}), 403);
  });
  for (const rating of [0,6,2.5,"5",null]) await test("Đánh giá: chặn số sao sai "+JSON.stringify(rating), async () => {
    status(await http("POST", reviewPath, {token:customer(),body:{bookingId:String(ownBooking._id),rating,comment:"Tour tốt"}}), 400);
  });
  for (const [label,comment] of [["trống","   "],["object",{x:1}],["quá 2000 ký tự","x".repeat(2001)]]) await test("Đánh giá: chặn nhận xét "+label, async () => {
    status(await http("POST", reviewPath, {token:customer(),body:{bookingId:String(ownBooking._id),rating:5,comment}}), 400);
  });
  await test("Đánh giá: không nhận userId hoặc tên tác giả từ client", async () => {
    status(await http("POST", reviewPath, {token:customer(),body:{bookingId:String(ownBooking._id),rating:5,comment:"Tour tốt",userId:state.otherId}}), 400);
  });
  await test("Đánh giá: tạo đánh giá thật từ đơn hoàn thành", async () => {
    const body = status(await http("POST", reviewPath, {token:customer(),body:{bookingId:String(ownBooking._id),rating:5,comment:"  Hành trình rất tốt  "}}), 201);
    reviewId=body.data._id; assert.equal(body.data.rating,5); assert.equal(body.data.comment,"Hành trình rất tốt");
    assert.equal(body.data.verifiedBooking,true); assert.equal(body.data.author.name,(await User.findById(state.userId)).name);
  });
  await test("Đánh giá: cùng đơn gửi lần nữa trả 409", async () => {
    status(await http("POST", reviewPath, {token:customer(),body:{bookingId:String(ownBooking._id),rating:1,comment:"Lần nữa"}}), 409);
  });
  await test("Đánh giá: đọc công khai, thống kê đúng, không lộ thông tin đơn/tài khoản", async () => {
    const body = status(await http("GET", reviewPath),200);
    assert.equal(body.summary.averageRating,5); assert.equal(body.summary.reviewCount,1); assert.equal(body.summary.distribution[5],1);
    const item=body.data[0]; assert.equal(item._id,reviewId);
    for(const key of ["bookingId","tourId","userId","contact","phone","email","zaloId"]) assert.ok(!(key in item));
    assert.deepEqual(Object.keys(item.author).sort(),["avatar","name"]);
  });
  await test("Đánh giá: chi tiết và danh sách tour có số sao thật", async () => {
    const detail=status(await http("GET","/api/tours/"+state.tour),200);
    const listed=status(await http("GET","/api/tours?limit=100"),200).data.find(t=>t._id===state.tour);
    assert.equal(detail.averageRating,5); assert.equal(detail.reviewCount,1);
    assert.equal(listed.averageRating,5); assert.equal(listed.reviewCount,1);
  });
  await test("Đánh giá: sau khi gửi, chỉ chủ thấy đánh giá của mình và đơn không còn eligible", async () => {
    const mine=status(await http("GET",reviewPath+"/eligibility",{token:customer()}),200);
    assert.ok(!mine.eligibleBookings.some(b=>b._id===String(ownBooking._id)));
    assert.equal(mine.myReviews[0]._id,reviewId);
    const other=status(await http("GET",reviewPath+"/eligibility",{token:stranger()}),200);
    assert.deepEqual(other.myReviews,[]);
  });
  await test("Đánh giá: người khác và admin không sửa số sao của tác giả", async () => {
    for (const token of [stranger(),admin()]) status(await http("PATCH","/api/reviews/"+reviewId,{token,body:{rating:1}}),404);
  });
  await test("Đánh giá: chặn sửa ID đơn/tác giả và payload rỗng", async () => {
    for (const body of [{bookingId:String(secondBooking._id)},{userId:state.otherId},{rating:0},{comment:" "},{}]) status(await http("PATCH","/api/reviews/"+reviewId,{token:customer(),body}),400);
  });
  await test("Đánh giá: chủ sửa sao/nhận xét, thống kê cập nhật", async () => {
    const body=status(await http("PATCH","/api/reviews/"+reviewId,{token:customer(),body:{rating:3,comment:"Đã cập nhật nhận xét"}}),200);
    assert.equal(body.data.rating,3);
    const list=status(await http("GET",reviewPath),200); assert.equal(list.summary.averageRating,3); assert.equal(list.summary.distribution[5],0); assert.equal(list.summary.distribution[3],1);
  });
  await test("Đánh giá: 5 request đồng thời cùng đơn chỉ tạo một review", async () => {
    const responses=await Promise.all(Array.from({length:5},()=>http("POST",reviewPath,{token:customer(),body:{bookingId:String(secondBooking._id),rating:5,comment:"Đánh giá đồng thời"}})));
    assert.equal(responses.filter(r=>r.status===201).length,1); assert.equal(responses.filter(r=>r.status===409).length,4);
    assert.equal(await Review.countDocuments({bookingId:secondBooking._id}),1);
    secondReviewId=responses.find(r=>r.status===201).body.data._id;
    const list=status(await http("GET",reviewPath),200); assert.equal(list.summary.reviewCount,2); assert.equal(list.summary.averageRating,4);
  },"concurrency");
  await test("Đánh giá: khách khác đánh giá đơn riêng, phân trang không trùng", async () => {
    otherReviewId=status(await http("POST",reviewPath,{token:stranger(),body:{bookingId:String(otherBooking._id),rating:1,comment:"Trải nghiệm cần cải thiện"}}),201).data._id;
    const first=status(await http("GET",reviewPath+"?page=1&limit=1"),200);
    const second=status(await http("GET",reviewPath+"?page=2&limit=1"),200);
    assert.equal(first.pagination.total,3); assert.equal(first.pagination.pages,3); assert.equal(first.summary.averageRating,3);
    assert.notEqual(first.data[0]._id,second.data[0]._id);
  });
  await test("Đánh giá: tour draft không lộ đánh giá ra công khai", async () => {
    await Tour.findByIdAndUpdate(state.tour,{status:"draft"});
    try { status(await http("GET",reviewPath),404); status(await http("GET",reviewPath,{token:admin()}),200); }
    finally { await Tour.findByIdAndUpdate(state.tour,{status:"published"}); }
  });
  await test("Đánh giá: xóa cần đăng nhập, người khác không xóa được", async () => {
    status(await http("DELETE","/api/reviews/"+reviewId),401);
    status(await http("DELETE","/api/reviews/"+reviewId,{token:stranger()}),404);
    status(await http("PATCH","/api/reviews/bad-id",{token:customer(),body:{rating:5}}),400);
    status(await http("DELETE","/api/reviews/"+newId(),{token:customer()}),404);
  });
  await test("Đánh giá: chủ xóa và admin kiểm duyệt xóa, thống kê trở về null/0", async () => {
    status(await http("DELETE","/api/reviews/"+reviewId,{token:customer()}),200);
    status(await http("DELETE","/api/reviews/"+secondReviewId,{token:customer()}),200);
    status(await http("DELETE","/api/reviews/"+otherReviewId,{token:admin()}),200);
    const list=status(await http("GET",reviewPath),200); assert.equal(list.summary.reviewCount,0); assert.equal(list.summary.averageRating,null);
    const detail=status(await http("GET","/api/tours/"+state.tour),200); assert.equal(detail.reviewCount,0); assert.equal(detail.averageRating,null);
    assert.ok(status(await http("GET",reviewPath+"/eligibility",{token:customer()}),200).eligibleBookings.some(b=>b._id===String(ownBooking._id)));
  });
}

async function runDeleteTests() {
  await test("Khách được hủy booking A đã confirmed",async()=>{
    const b=status(await cancel(state.bookingA.booking._id),200);assert.equal(b.data.status,"cancelled");
  });
  await test("Admin DELETE Coupon xóa document",async()=>{
    status(await http("DELETE","/api/coupons/"+state.coupon,{token:admin()}),200);assert.equal(await Coupon.findById(state.coupon),null);
  });
  await test("Admin DELETE Departure là đóng nhận đặt",async()=>{
    const b=status(await http("DELETE","/api/departures/"+state.departure,{token:admin()}),200);assert.equal(b.data.status,"closed");
    const list=status(await http("GET","/api/tours/"+state.tour+"/departures"),200);assert.equal(list.data.length,0);
  });
  for(const [route,key] of [["tours","tour"],["articles","article"],["destinations","destination"]]){
    await test("Admin DELETE "+route+" archive, khách không thấy",async()=>{
      status(await http("DELETE","/api/"+route+"/"+state[key],{token:admin()}),200);
      status(await http("GET","/api/"+route+"/"+state[key]),404);
      assert.equal(status(await http("GET","/api/"+route+"/"+state[key],{token:admin()}),200).status,"archived");
    });
  }
}

async function runBookingTests() {
  await test("Quote tính đúng 2 người lớn + 1 trẻ em",async()=>{
    const q=await getQuote();assert.equal(q.subTotal,1350000);assert.equal(q.total,1350000);assert.equal(q.durationHours,4);assert.equal(q.currency,"VND");assert.ok(q.quoteToken);
  });
  for(const [label,body,expected] of [
    ["adults bằng 0",{adults:0},400],["adults dạng chuỗi",{adults:"2"},400],
    ["adults số lẻ",{adults:1.5},400],["children âm",{children:-1},400],
    ["vượt 10 khách",{adults:10,children:1},400],["ID sai",{departureId:"bad-id"},400],
    ["chuyến không tồn tại",{departureId:newId()},404],["coupon không tồn tại",{couponCode:"NOT-FOUND"},400]
  ])await test("Quote chặn "+label,async()=>status(await http("POST","/api/bookings/quote",{body:{departureId:state.departure,adults:2,children:1,...body}}),expected));
  await test("Quote trẻ em yêu cầu childPolicy",async()=>{
    const tour=await Tour.findById(state.tour);const old=tour.childPolicy;
    await Tour.findByIdAndUpdate(state.tour,{childPolicy:""});
    try{status(await http("POST","/api/bookings/quote",{body:{departureId:state.departure,adults:2,children:1}}),400);}
    finally{await Tour.findByIdAndUpdate(state.tour,{childPolicy:old});}
  });
  await test("Quote coupon đúng, chưa trừ quota",async()=>{
    const q=await getQuote({couponCode:state.couponCode.toLowerCase()});assert.equal(q.discountAmount,135000);assert.equal(q.total,1215000);
    assert.equal((await Coupon.findById(state.coupon)).usedCount,0);
  });
  for(const [label,fields] of [["inactive",{isActive:false}],["expired",{validFrom:future(-3),validUntil:future(-2)}],
    ["quota exhausted",{usageLimit:0}],["minimum order",{minOrderValue:9999999}]]){
    await test("Quote chặn coupon "+label,async()=>{
      const c=await Coupon.create(couponBody({code:"COUPON-"+label.replaceAll(" ","-")+"-"+runId,...fields}));
      status(await http("POST","/api/bookings/quote",{body:{departureId:state.departure,adults:2,children:1,couponCode:c.code}}),400);
    });
  }
  await test("Tạo booking A pending_confirmation/unpaid",async()=>{
    state.bookingA=await createBooking();const b=state.bookingA.booking;
    assert.equal(b.status,"pending_confirmation");assert.equal(b.paymentStatus,"unpaid");assert.equal(b.userId,state.userId);assert.equal(b.snapshot.total,1350000);
    assert.equal(b.snapshot.durationHours,4);assert.equal(state.bookingA.response.replayed,false);assert.ok(!("idempotencyKey" in b));assert.ok(!("requestHash" in b));
  });
  await test("Replay cùng payload/key trả đúng đơn cũ",async()=>{
    requireState("bookingA");const a=state.bookingA;
    const b=status(await http("POST","/api/bookings",{token:customer(),body:a.payload,headers:{"Idempotency-Key":a.key}}),200);
    assert.equal(b.replayed,true);assert.equal(b.data._id,a.booking._id);assert.equal(await Booking.countDocuments({userId:state.userId,idempotencyKey:a.key}),1);
  });
  await test("Cùng key đổi payload trả 409",async()=>{
    const a=state.bookingA;status(await http("POST","/api/bookings",{token:customer(),body:{...a.payload,note:"Đã đổi note"},headers:{"Idempotency-Key":a.key}}),409);
  });
  await test("Thứ tự khóa contact không gây conflict",async()=>{
    const a=state.bookingA;const payload={...a.payload,contact:{phone:a.payload.contact.phone,name:a.payload.contact.name}};
    assert.equal(status(await http("POST","/api/bookings",{token:customer(),body:payload,headers:{"Idempotency-Key":a.key}}),200).replayed,true);
  });
  await test("5 request đồng thời cùng key chỉ tạo một booking",async()=>{
    const q=await getQuote(),payload=bookingBody(q),key=randomUUID();
    const all=await Promise.all(Array.from({length:5},()=>http("POST","/api/bookings",{token:customer(),body:payload,headers:{"Idempotency-Key":key}})));
    assert.ok(all.every(r=>[200,201].includes(r.status)),"HTTP: "+all.map(r=>r.status));
    assert.equal(new Set(all.map(r=>r.body.data?._id)).size,1);assert.equal(await Booking.countDocuments({userId:state.userId,idempotencyKey:key}),1);
    return {statuses:all.map(r=>r.status),documents:1};
  },"concurrency");
  for(const [label,body,headers] of [
    ["thiếu quoteToken",{contact:{name:"Demo",phone:"0901"}},{"Idempotency-Key":randomUUID()}],
    ["thiếu contact",{quoteToken:"anything"},{"Idempotency-Key":randomUUID()}],
    ["contact thiếu phone",{quoteToken:"anything",contact:{name:"Demo"}},{"Idempotency-Key":randomUUID()}],
    ["thiếu header",state.bookingA.payload,{}],["key quá ngắn",state.bookingA.payload,{"Idempotency-Key":"short"}]
  ])await test("Tạo booking chặn "+label,async()=>status(await http("POST","/api/bookings",{token:customer(),body,headers}),400));
  await test("QuoteToken bị sửa trả 409",async()=>{
    status(await http("POST","/api/bookings",{token:customer(),body:{...state.bookingA.payload,quoteToken:"invalid-quote"},headers:{"Idempotency-Key":randomUUID()}}),409);
  });
  await test("QuoteToken hết hạn trả 409",async()=>{
    const token=jwt.sign({departureId:state.departure,adults:2,children:1,hash:"expired"},sessionSecret,{issuer:"vna-daksong-api",audience:"quote",expiresIn:-1});
    status(await http("POST","/api/bookings",{token:customer(),body:bookingBody({quoteToken:token}),headers:{"Idempotency-Key":randomUUID()}}),409);
  });
  await test("Thay giá sau quote: 409, rollback quota coupon",async()=>{
    const q=await getQuote({couponCode:state.couponCode});
    status(await http("PATCH","/api/departures/"+state.departure,{token:admin(),body:{adultPrice:600000}}),200);
    try{
      status(await http("POST","/api/bookings",{token:customer(),body:bookingBody(q),headers:{"Idempotency-Key":randomUUID()}}),409);
      assert.equal((await Coupon.findById(state.coupon)).usedCount,0);
      assert.equal((await Booking.findById(state.bookingA.booking._id)).snapshot.total,1350000);
    }finally{await Departure.findByIdAndUpdate(state.departure,{adultPrice:500000});}
  });
  await test("Hạ maxGuests sau quote được kiểm tra lúc tạo",async()=>{
    const q=await getQuote();await Departure.findByIdAndUpdate(state.departure,{maxGuestsPerBooking:2});
    try{status(await http("POST","/api/bookings",{token:customer(),body:bookingBody(q),headers:{"Idempotency-Key":randomUUID()}}),400);}
    finally{await Departure.findByIdAndUpdate(state.departure,{maxGuestsPerBooking:10});}
  });
  await test("Đóng chuyến sau quote chặn tạo booking",async()=>{
    const q=await getQuote();await Departure.findByIdAndUpdate(state.departure,{status:"closed"});
    try{status(await http("POST","/api/bookings",{token:customer(),body:bookingBody(q),headers:{"Idempotency-Key":randomUUID()}}),409);}
    finally{await Departure.findByIdAndUpdate(state.departure,{status:"open"});}
  });
  await test("Khách xem mine chỉ có đơn của mình",async()=>{
    const b=status(await http("GET","/api/bookings/mine?status=pending_confirmation",{token:customer()}),200);assert.ok(b.data.length);assert.ok(b.data.every(x=>x.userId===state.userId));
  });
  await test("Khách B GET bookings không thấy đơn A",async()=>{
    const b=status(await http("GET","/api/bookings",{token:stranger()}),200);assert.equal(b.data.length,0);
  });
  await test("Khách A đọc detail của mình",async()=>assert.equal(status(await http("GET","/api/bookings/"+state.bookingA.booking._id,{token:customer()}),200).data._id,state.bookingA.booking._id));
  await test("Khách B không đọc detail A",async()=>status(await http("GET","/api/bookings/"+state.bookingA.booking._id,{token:stranger()}),404));
  await test("Admin list booking theo code/departure",async()=>{
    const a=state.bookingA.booking;const b=status(await http("GET","/api/bookings?code="+a.code+"&departureId="+state.departure,{token:admin()}),200);assert.equal(b.data.length,1);assert.equal(b.data[0]._id,a._id);
  });
  await test("Khách không gọi admin status",async()=>status(await http("PATCH","/api/bookings/"+state.bookingA.booking._id+"/status",{token:customer(),body:{status:"confirmed"}}),403));
  await test("Admin confirmed A, paymentStatus vẫn unpaid",async()=>{
    const b=status(await change(state.bookingA.booking._id,"confirmed"),200);assert.equal(b.data.status,"confirmed");assert.equal(b.data.paymentStatus,"unpaid");
  });
  await test("Không confirmed A hai lần",async()=>status(await change(state.bookingA.booking._id,"confirmed"),409));
  await test("Không completed A trước khi tour kết thúc",async()=>status(await change(state.bookingA.booking._id,"completed"),409));
  await test("Không đổi lịch chuyến đã có booking",async()=>status(await http("PATCH","/api/departures/"+state.departure,{token:admin(),body:{departureAt:future(9)}}),409));
  await test("Admin dashboard có trạng thái và tổng giá trị đơn",async()=>{
    const b=status(await http("GET","/api/bookings/dashboard-data",{token:admin()}),200);assert.ok(b.bookings.confirmed>=1);assert.ok(b.totalRevenue>=1350000);assert.ok(b.tours>=1);
  });
  await test("Dashboard chặn khách",async()=>status(await http("GET","/api/bookings/dashboard-data",{token:customer()}),403));
  await test("Tạo B và hủy bắt buộc lý do",async()=>{
    state.bookingB=await createBooking();status(await http("PATCH","/api/bookings/"+state.bookingB.booking._id+"/cancel",{token:customer(),body:{}}),400);
  });
  await test("Sai chủ không hủy B",async()=>status(await cancel(state.bookingB.booking._id,"Demo",stranger()),404));
  await test("Chủ đơn hủy B và không hủy lần hai",async()=>{
    assert.equal(status(await cancel(state.bookingB.booking._id),200).data.status,"cancelled");status(await cancel(state.bookingB.booking._id),409);
  });
  await test("Không mở lại đơn đã hủy",async()=>status(await change(state.bookingB.booking._id,"confirmed"),409));
  await test("Coupon tạo C tăng quota, hủy hoàn quota",async()=>{
    const c=await createBooking({quote:{couponCode:state.couponCode}});assert.equal(c.booking.snapshot.total,1215000);assert.equal((await Coupon.findById(state.coupon)).usedCount,1);
    status(await cancel(c.booking._id),200);assert.equal((await Coupon.findById(state.coupon)).usedCount,0);
  });
  await test("Admin rejected cần lý do và không mở lại",async()=>{
    const c=await createBooking();status(await http("PATCH","/api/bookings/"+c.booking._id+"/status",{token:admin(),body:{status:"rejected"}}),400);
    assert.equal(status(await change(c.booking._id,"rejected"),200).data.status,"rejected");status(await change(c.booking._id,"confirmed"),409);
  });
  await test("Completed sau giờ kết thúc cộng điểm đúng một lần (fixture quá khứ)",async()=>{
    const template=await Booking.findById(state.bookingA.booking._id).lean();
    delete template._id;delete template.__v;delete template.createdAt;delete template.updatedAt;
    const fixture=await Booking.create({...template,code:"VNA-PAST-"+randomBytes(5).toString("hex"),idempotencyKey:randomUUID(),requestHash:"fixture",
      status:"confirmed",paymentStatus:"paid",snapshot:{...template.snapshot,departureAt:new Date(Date.now()-8*3600000),durationHours:4}});
    const before=(await User.findById(state.userId)).loyaltyPoints;
    assert.equal(status(await change(String(fixture._id),"completed"),200).data.status,"completed");
    const after=(await User.findById(state.userId)).loyaltyPoints;assert.equal(after-before,135);
    status(await change(String(fixture._id),"completed"),409);assert.equal((await User.findById(state.userId)).loyaltyPoints,after);
    return {fixture:"Chỉ database test; departureAt quá khứ",pointsAdded:after-before};
  });
}

async function runTests() {
  await test("Server phản hồi đúng tên service",async()=>{
    assert.equal(status(await http("GET","/"),200).service,"VNA Dak Song Booking API");
  });
  await test("API không tồn tại trả 404",async()=>status(await http("GET","/api/not-found"),404));
  await test("JSON lỗi cú pháp trả 400",async()=>status(await http("POST","/api/auth/admin/login",{raw:'{"email":'}),400));
  await test("Admin đăng nhập thành công, không lộ password",async()=>{
    const b=status(await http("POST","/api/auth/admin/login",{body:{email:"api-test-admin@example.test",password:adminPassword}}),200);
    assert.equal(b.user.role,"admin");assert.ok(!("password" in b.user));state.adminToken=b.token;
  });
  await test("Admin sai mật khẩu trả 401",async()=>status(await http("POST","/api/auth/admin/login",{body:{email:"api-test-admin@example.test",password:"wrong-password"}}),401));
  await test("Admin thiếu email trả 400",async()=>status(await http("POST","/api/auth/admin/login",{body:{password:"anything"}}),400));
  await test("Admin password quá 72 byte trả 400",async()=>status(await http("POST","/api/auth/admin/login",{body:{email:"api-test-admin@example.test",password:"x".repeat(73)}}),400));
  await test("Mock login bị chặn khi chưa bật",async()=>{
    process.env.ALLOW_MOCK_LOGIN="false";
    try{status(await http("POST","/api/auth/mock",{body:{phone:"0900000001"}}),403);}finally{process.env.ALLOW_MOCK_LOGIN="true";}
  });
  await test("Mock login bị chặn ở production",async()=>{
    process.env.NODE_ENV="production";
    try{status(await http("POST","/api/auth/mock",{body:{phone:"0900000001"}}),403);}finally{process.env.NODE_ENV="test";}
  });
  for(const [label,phone,tokenKey,idKey] of [["A","0900000001","userToken","userId"],["B","0900000002","otherToken","otherId"]]){
    await test("Mock đăng nhập khách "+label,async()=>{
      const b=status(await http("POST","/api/auth/mock",{body:{name:"API Test "+label,phone}}),200);
      assert.equal(b.user.role,"user");state[tokenKey]=b.token;state[idKey]=b.user._id;
    });
  }
  await test("Mock thiếu số điện thoại trả 400",async()=>status(await http("POST","/api/auth/mock",{body:{name:"Demo"}}),400));
  await test("GET me đúng khách và không trả password",async()=>{
    const b=status(await http("GET","/api/auth/me",{token:customer()}),200);assert.equal(b.user._id,state.userId);assert.ok(!("password" in b.user));
  });
  await test("GET me không token trả 401",async()=>status(await http("GET","/api/auth/me"),401));
  await test("GET me token sai trả 401",async()=>status(await http("GET","/api/auth/me",{token:"wrong-token"}),401));
  await test("Token hết hạn trả 401",async()=>{
    const token=jwt.sign({sub:state.userId},sessionSecret,{issuer:"vna-daksong-api",audience:"session",expiresIn:-1});
    status(await http("GET","/api/auth/me",{token}),401);
  });
  await test("Token sai audience trả 401",async()=>{
    const token=jwt.sign({sub:state.userId},sessionSecret,{issuer:"vna-daksong-api",audience:"quote"});
    status(await http("GET","/api/auth/me",{token}),401);
  });
  await test("Khóa user có hiệu lực với token đang còn hạn",async()=>{
    await User.findByIdAndUpdate(state.otherId,{active:false});
    try{status(await http("GET","/api/auth/me",{token:stranger()}),401);}finally{await User.findByIdAndUpdate(state.otherId,{active:true});}
  });
  await test("Quyền admin lấy từ DB, không tin role tự chèn vào JWT",async()=>{
    const token=jwt.sign({sub:state.userId,role:"admin"},sessionSecret,{issuer:"vna-daksong-api",audience:"session"});
    status(await http("GET","/api/coupons",{token}),403);
  });
  await test("Zalo đăng nhập thành công qua provider giả lập",async()=>{
    const b=status(await http("POST","/api/auth/zalo",{body:{accessToken:"simulated-zalo-access-token"}}),200);
    assert.equal(b.user.zaloId,"999000000001");assert.equal(b.user.role,"user");assert.ok(b.token);
  },"external-mocked");
  await test("Zalo thiếu accessToken trả 400",async()=>status(await http("POST","/api/auth/zalo",{body:{}}),400));
  await test("Zalo token có xuống dòng trả 400",async()=>status(await http("POST","/api/auth/zalo",{body:{accessToken:"bad\ntoken"}}),400));
  for(const [mode,code] of [["invalid",401],["bad-id",401],["network-error",502]]){
    await test("Zalo provider "+mode+" trả "+code,async()=>{
      zaloMode=mode;try{status(await http("POST","/api/auth/zalo",{body:{accessToken:"demo"}}),code);}finally{zaloMode="success";}
    },"external-mocked");
  }
  await test("Zalo thiếu cấu hình trả 503",async()=>{
    const key=process.env.ZALO_APP_SECRET;delete process.env.ZALO_APP_SECRET;
    try{status(await http("POST","/api/auth/zalo",{body:{accessToken:"demo"}}),503);}finally{process.env.ZALO_APP_SECRET=key;}
  });

  // CRUD thành công: tạo qua HTTP và kiểm tra bằng cả HTTP lẫn MongoDB.
  await test("Admin CREATE Destination",async()=>{state.destination=status(await http("POST","/api/destinations",{token:admin(),body:destinationBody()}),201)._id;});
  await test("Admin CREATE Article",async()=>{requireState("destination");state.article=status(await http("POST","/api/articles",{token:admin(),body:articleBody()}),201)._id;});
  await test("Admin CREATE Tour",async()=>{requireState("destination");state.tour=status(await http("POST","/api/tours",{token:admin(),body:tourBody()}),201)._id;});
  await test("Admin CREATE Departure",async()=>{requireState("tour");state.departure=status(await http("POST","/api/departures",{token:admin(),body:departureBody()}),201)._id;});
  await test("Admin CREATE Coupon",async()=>{const b=status(await http("POST","/api/coupons",{token:admin(),body:couponBody()}),201);state.coupon=b.data._id;state.couponCode=b.data.code;});
  const resources=[
    ["destinations","destination",{address:"Địa chỉ demo đã sửa"},{visitNotes:"Ghi chú đã sửa"}],
    ["articles","article",{summary:"Tóm tắt đã sửa"},{content:"Nội dung đã sửa"}],
    ["tours","tour",{summary:"Tóm tắt tour đã sửa"},{description:"Mô tả đã sửa"}],
    ["departures","departure",{adultPrice:500000},{maxGuestsPerBooking:10}]
  ];
  for(const [route,key,putBody,patchBody] of resources){
    await test("READ list "+route,async()=>{
      requireState(key);const b=status(await http("GET","/api/"+route,{token:route==="departures"?admin():undefined}),200);
      assert.ok(b.data.some(x=>x._id===state[key]));assert.ok(b.pagination);
    });
    await test("READ detail "+route,async()=>{
      requireState(key);assert.equal(status(await http("GET","/api/"+route+"/"+state[key],{token:route==="departures"?admin():undefined}),200)._id,state[key]);
    });
    for(const [method,body] of [["PUT",putBody],["PATCH",patchBody]]){
      await test("Admin "+method+" "+route+" rồi đọc lại",async()=>{
        requireState(key);const b=status(await http(method,"/api/"+route+"/"+state[key],{token:admin(),body}),200);
        for(const [field,value] of Object.entries(body))assert.deepEqual(b[field],value);
        const read=status(await http("GET","/api/"+route+"/"+state[key],{token:admin()}),200);
        for(const [field,value] of Object.entries(body))assert.deepEqual(read[field],value);
      });
    }
    await test("Khách không CREATE "+route,async()=>status(await http("POST","/api/"+route,{token:customer(),body:{}}),403));
    for(const method of ["PUT","PATCH","DELETE"]){
      await test("Khách không "+method+" "+route,async()=>status(await http(method,"/api/"+route+"/"+state[key],{token:customer(),body:method==="DELETE"?undefined:{}}),403));
    }
    await test("ID không hợp lệ khi đọc "+route,async()=>status(await http("GET","/api/"+route+"/bad-id",{token:admin()}),400));
    await test("ID không tồn tại khi đọc "+route,async()=>status(await http("GET","/api/"+route+"/"+newId(),{token:admin()}),404));
  }
  await test("Admin READ và lọc Coupon",async()=>{const b=status(await http("GET","/api/coupons?isActive=true&sort=oldest&page=1&limit=100",{token:admin()}),200);assert.ok(b.data.some(x=>x._id===state.coupon));});
  await test("Admin UPDATE Coupon",async()=>{const b=status(await http("PUT","/api/coupons/"+state.coupon,{token:admin(),body:{description:"Coupon đã sửa",isActive:true}}),200);assert.equal(b.data.description,"Coupon đã sửa");});
  await test("Coupon trùng code trả 400",async()=>status(await http("POST","/api/coupons",{token:admin(),body:couponBody()}),400));
  await test("Coupon percentage quá 100 trả 400",async()=>status(await http("POST","/api/coupons",{token:admin(),body:couponBody({code:"BAD-100",discountValue:101})}),400));
  for(const [method,url] of [["GET","/api/coupons"],["POST","/api/coupons"],["PUT","/api/coupons/"+state.coupon],["DELETE","/api/coupons/"+state.coupon]]){
    await test("Khách bị chặn Coupon "+method,async()=>status(await http(method,url,{token:customer(),body:["POST","PUT"].includes(method)?{}:undefined}),403));
  }
  await test("Danh sách phân trang giới hạn tối đa 100",async()=>{
    const b=status(await http("GET","/api/destinations?page=0&limit=1000"),200);assert.equal(b.pagination.page,1);assert.equal(b.pagination.limit,100);
  });
  for(const route of ["destinations","articles","tours"]){
    await test("Text search có index: "+route,async()=>{
      const b=status(await http("GET","/api/"+route+"?q=API"),200);assert.ok(b.data.length>0);
    });
  }
  await test("Tour lọc giá/ngày/chủ đề/thời lượng/điểm đến",async()=>{
    const url="/api/tours?destinationId="+state.destination+"&theme=nature&maxDurationHours=4&minPrice=400000&maxPrice=600000&dateFrom="+encodeURIComponent(future(5))+"&dateTo="+encodeURIComponent(future(8))+"&sort=price_asc";
    const b=status(await http("GET",url),200);const item=b.data.find(x=>x._id===state.tour);assert.ok(item);assert.equal(item.priceFrom,500000);assert.equal(item.hasUpcomingDeparture,true);
  });
  for(const sort of ["newest","duration","price_desc","most_bought"]){
    await test("Tour sort "+sort,async()=>status(await http("GET","/api/tours?sort="+sort),200));
  }
  for(const query of ["theme=bad","sort=bad","minPrice=999&maxPrice=1","maxDurationHours=0","dateFrom=bad-date"]){
    await test("Tour query sai: "+query,async()=>status(await http("GET","/api/tours?"+query),400));
  }
  await test("Chuyến công khai nằm dưới /tours/:id/departures",async()=>{
    const b=status(await http("GET","/api/tours/"+state.tour+"/departures"),200);assert.ok(b.data.some(x=>x._id===state.departure));
  });
  await test("Danh sách chuyến quản trị chặn user",async()=>status(await http("GET","/api/departures",{token:customer()}),403));
  await test("Nội dung draft chỉ admin thấy",async()=>{
    const draft=status(await http("POST","/api/destinations",{token:admin(),body:destinationBody({slug:"api-test-draft-"+runId,status:"draft",sources:[]})}),201);
    status(await http("GET","/api/destinations/"+draft._id),404);
    assert.equal(status(await http("GET","/api/destinations/"+draft._id,{token:admin()}),200).status,"draft");
  });
  await test("Catalog token sai không được bỏ qua",async()=>status(await http("GET","/api/tours",{token:"bad-token"}),401));
  await test("Published Destination thiếu nguồn trả 400",async()=>status(await http("POST","/api/destinations",{token:admin(),body:destinationBody({slug:"no-sources-"+runId,sources:[]})}),400));
  await test("Published Article thiếu nguồn trả 400",async()=>status(await http("POST","/api/articles",{token:admin(),body:articleBody({slug:"no-sources-article-"+runId,sources:[]})}),400));
  await test("Published Tour thiếu itinerary trả 400",async()=>status(await http("POST","/api/tours",{token:admin(),body:tourBody({slug:"no-itinerary-"+runId,itinerary:[]})}),400));
  await test("Điểm dừng ngoài destinationIds bị chặn",async()=>status(await http("POST","/api/tours",{token:admin(),body:tourBody({slug:"bad-stop-"+runId,itinerary:[{title:"Demo",description:"Demo",destinationId:newId()}]})}),400));
  await test("Hạn đặt sau khởi hành trả 400",async()=>status(await http("POST","/api/departures",{token:admin(),body:departureBody({bookingDeadline:future(8)})}),400));
  await test("Giá chuyến dạng chuỗi bị chặn",async()=>status(await http("POST","/api/departures",{token:admin(),body:departureBody({adultPrice:"500000"})}),400));
  await test("Lưu tour và đọc danh sách saved",async()=>{
    assert.equal(status(await http("POST","/api/tours/"+state.tour+"/save",{token:customer()}),200).isSaved,true);
    const saved=status(await http("GET","/api/tours/saved",{token:customer()}),200);assert.ok(saved.data.some(x=>x._id===state.tour));
  });
  await test("Bỏ lưu tour bằng toggle",async()=>{
    assert.equal(status(await http("POST","/api/tours/"+state.tour+"/save",{token:customer()}),200).isSaved,false);
    assert.equal(status(await http("GET","/api/tours/saved",{token:customer()}),200).data.length,0);
  });
  await test("Saved tour không token trả 401",async()=>status(await http("GET","/api/tours/saved"),401));

  await runBookingTests();
  await runPaymentTests();
  await runUploadTests();
  await runRegressionTests();
  await runPaymentRecoveryTests();
  await runReviewTests();
  await test("Thông báo công khai chỉ có bài viết đã xuất bản",async()=>{
    const body=status(await http("GET","/api/notifications"),200);
    assert.ok(body.data.length>0);
    assert.ok(body.data.every(item=>item.type==="article"&&item.href.startsWith("/articles/")));
  });
  await test("Đọc thông báo qua server thật lưu trạng thái cho tài khoản",async()=>{
    const body=status(await http("GET","/api/notifications?type=article",{token:customer()}),200);
    const item=body.data[0];assert.ok(item);
    status(await http("PATCH","/api/notifications/"+encodeURIComponent(item.id)+"/read",{token:customer()}),200);
    const refreshed=status(await http("GET","/api/notifications?type=article",{token:customer()}),200);
    assert.ok(refreshed.data.find(entry=>entry.id===item.id)?.readAt);
  });
  await test("Đọc tất cả thông báo yêu cầu đăng nhập và xóa số chưa đọc",async()=>{
    status(await http("PATCH","/api/notifications/read-all"),401);
    status(await http("PATCH","/api/notifications/read-all",{token:customer()}),200);
    assert.equal(status(await http("GET","/api/notifications",{token:customer()}),200).unreadCount,0);
  });
  await runDeleteTests();
  await test("Đã gọi đủ mọi endpoint đang mount",async()=>{
    const seen=new Set(requests.map(r=>r.endpoint));const missing=endpoints.filter(e=>!seen.has(e.method+" "+e.path));assert.deepEqual(missing,[]);
    return {apiEndpoints:endpoints.length-1,coveredApiEndpoints:endpoints.length-1};
  },"coverage");
}
