import {test,expect} from '@playwright/test';
import {fixtureBaseline} from '../scripts/fixture-baseline';
test('normal reference screenshot detects selected receipt occlusion although identical DOM suite passes',async({page,request})=>{
 try{await request.put('http://127.0.0.1:4310/api/demo/state',{data:{state:'normal'}});await fixtureBaseline(page,'http://127.0.0.1:4310/demo/order');await expect(page).toHaveScreenshot('order.png');await request.put('http://127.0.0.1:4310/api/demo/state',{data:{state:'cover-wide'}});await fixtureBaseline(page,'http://127.0.0.1:4310/demo/order');await expect(page).not.toHaveScreenshot('order.png');}finally{await request.put('http://127.0.0.1:4310/api/demo/state',{data:{state:'normal'}});}
});
