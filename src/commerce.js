export const purchaseProductId=purchase=>purchase?.productID||purchase?.id||'';
// Catalog amounts are the base values; the player receives the displayed
// total, including the clearly advertised bundle bonus.
const COIN_PACKS={
 coins_handful:{base:500,bonus:0,total:500},
 coins_pouch:{base:1200,bonus:240,total:1440},
 coins_satchel:{base:3000,bonus:750,total:3750},
 coins_chest:{base:7500,bonus:2625,total:10125},
 coins_expedition:{base:18000,bonus:9000,total:27000}
};
const tokenOf=purchase=>typeof purchase?.purchaseToken==='string'?purchase.purchaseToken:'';

export class CommerceService{
 constructor({platform,store,analytics,getConfig,save}){
  this.platform=platform;
  this.store=store;
  this.analytics=analytics;
 this.getConfig=getConfig;
 this.save=save;
  this.catalogItems=[];
  this.catalogState='idle';
  this.catalogAttempts=0;
  this.catalogUpdatedAt=0;
 }
 async loadCatalog({force=false}={}){
  if(!this.available()){this.catalogState='disabled';return []}
  if(!force&&this.catalogState==='ready'&&this.catalogItems.length)return this.catalogItems;
  this.catalogState='loading';
  const delays=[0,350,1000];
  for(let attempt=0;attempt<delays.length;attempt++){
   if(delays[attempt])await new Promise(resolve=>setTimeout(resolve,delays[attempt]));
   this.catalogAttempts++;
   const items=await this.platform.catalog();
   if(Array.isArray(items)&&items.length){
    this.catalogItems=items;this.catalogState='ready';this.catalogUpdatedAt=Date.now();
    this.analytics.send('catalog_success',{products:items.length,attempt:attempt+1});
    return this.catalogItems;
   }
  }
  this.catalogItems=[];this.catalogState='empty';this.catalogUpdatedAt=Date.now();
  this.analytics.send('catalog_empty',{attempts:delays.length});
  return this.catalogItems;
 }
 product(productId){return this.catalogItems.find(item=>purchaseProductId(item)===productId||item?.productId===productId)||null;}
 available(){
  const config=this.getConfig();
  return config.commerceEnabled===true&&config.commerceClientMode==='client-v1';
 }
 receiptKnown(token){const state=this.store.state;return !!token&&(!!state.purchaseLedger?.[token]||state.processedPurchases.includes(token)||Object.prototype.hasOwnProperty.call(state.purchaseGrants||{},token));}
 recordReceipt(token,productId,amount){const state=this.store.state;state.purchaseLedger??={};state.purchaseLedger[token]={productId,amount,status:state.purchaseLedger[token]?.status==='consumed'?'consumed':'pending',updatedAt:Date.now()};state.processedPurchases.push(token);state.processedPurchases=[...new Set(state.processedPurchases)];state.purchaseGrants??={};if(!Object.prototype.hasOwnProperty.call(state.purchaseGrants,token))state.purchaseGrants[token]=amount;}
 async settleReceipt(token,productId){const state=this.store.state,entry=state.purchaseLedger?.[token];if(!entry)return false;if(entry.status==='consumed')return true;
  const cloudSaved=this.platform.cloudReady&&await this.platform.flush(true);if(!cloudSaved){this.analytics.send('purchase_consume_pending',{product:productId});return false;}
  const consumed=await this.platform.consume(token);if(!consumed){this.analytics.send('purchase_consume_pending',{product:productId});return false;}
  entry.status='consumed';entry.updatedAt=Date.now();this.save();await this.platform.flush(true);this.analytics.send('purchase_consumed',{product:productId});return true;
 }
 async applyPurchase(purchase){
  const config=this.getConfig(),productId=purchaseProductId(purchase),state=this.store.state;
  if(!this.platform.cloudReady)return {ok:false,reason:'cloud-unavailable',productId};
  const coinProduct=Object.entries(config.catalog).find(([key,id])=>key.startsWith('coins_')&&id===productId);
  if(coinProduct){
   const token=tokenOf(purchase);if(!token)return {ok:false,reason:'missing-token',productId};
   const amount=COIN_PACKS[coinProduct[0]]?.total||0,already=this.receiptKnown(token);
   if(!already){state.coins+=amount;this.recordReceipt(token,productId,amount);this.save();}
   else if(!state.purchaseLedger?.[token]){this.recordReceipt(token,productId,amount);this.save();}
   await this.settleReceipt(token,productId);
   return {ok:true,productId,changed:!already,kind:'coins',amount};
  }
  if(productId===config.catalog.no_ads){
   const changed=!state.adsRemoved;
   state.adsRemoved=true;
   if(changed){this.save();if(this.platform.cloudReady)await this.platform.flush(true);}
   return {ok:true,productId,changed,kind:'no-ads'};
  }
  if(productId!==config.catalog.starter_explorer)return {ok:false,reason:'unknown-product',productId};
  const token=tokenOf(purchase);
  if(!token)return {ok:false,reason:'missing-token',productId};
  const already=this.receiptKnown(token);
  if(!already&&state.starterClaimed){
   // Набор исследователя — разовая стартовая покупка. Новый чек после
   // получения набора помечаем обработанным, но повторно не выдаём награду.
   this.recordReceipt(token,productId,0);
   this.save();
   await this.settleReceipt(token,productId);
   return {ok:true,productId,changed:false,kind:'starter',reason:'already-claimed'};
  }
  if(!already){
   state.coins+=300;
   state.freeHints+=3;
   if(!state.pets.includes('owl')){state.pets.push('owl');state.activePet='owl';state.petLevels.owl=1;}
   state.starterClaimed=true;
   this.recordReceipt(token,productId,300);
   this.save();
  }
  await this.settleReceipt(token,productId);
  return {ok:true,productId,changed:!already,kind:'starter'};
 }
 async recover(){
  if(!this.available())return {ok:false,restored:0,reason:'disabled'};
  if(!this.platform.cloudReady)return {ok:false,restored:0,reason:'cloud-unavailable'};
  const purchases=await this.platform.restorePurchases();
  let restored=0;
  for(const purchase of purchases){const result=await this.applyPurchase(purchase);if(result.ok)restored++;}
  return {ok:true,restored};
 }
 async buy(productId){
  if(!this.available())return {ok:false,reason:'disabled'};
  if(!this.platform.cloudReady)return {ok:false,reason:'cloud-unavailable'};
  this.analytics.send('purchase_start',{product:productId});
  const purchase=await this.platform.purchase(productId);
  if(!purchase){this.analytics.send('purchase_cancel',{product:productId});return {ok:false,reason:'cancel'};}
  const actual=purchaseProductId(purchase);
  if(actual!==productId){this.analytics.send('purchase_invalid',{expected:productId,actual:actual||'unknown'});return {ok:false,reason:'product-mismatch'};}
  const result=await this.applyPurchase(purchase);
  if(!result.ok){this.analytics.send('purchase_invalid',{expected:productId,actual:'invalid_receipt'});return result;}
  this.analytics.send('purchase_success',{product:productId});
  return result;
 }
}
