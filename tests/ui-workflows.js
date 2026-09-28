// Run only against scripts/Start-Taller.ps1 -Port 5182 -UiTest.
// playwright-cli -s=ui-test run-code --filename=tests/ui-workflows.js
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  assert(page.url().startsWith('http://localhost:5182/'), 'Use the isolated UI server on port 5182.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:1440,height:1000});
  await page.context().route('**/*', route => route.continue());
  await page.reload();
  const session = await (await page.request.get('http://localhost:5182/api/auth/session')).json();
  if (session.needsSetup) {
    await page.getByLabel('Nombre completo').fill('María López — Taller de prueba');
    await page.getByLabel('Correo electrónico').fill('ui.design@example.test');
    await page.getByLabel('Contraseña', {exact:true}).fill('Pruebas!Taller2026');
    await page.getByRole('button', {name:'Crear administrador'}).click();
  } else if (!session.user) {
    await page.getByLabel('Correo electrónico').fill('ui.design@example.test');
    await page.getByLabel('Contraseña', {exact:true}).fill('Pruebas!Taller2026');
    await page.getByRole('button', {name:'Iniciar sesión'}).click();
  } else {
    assert(session.user.email === 'ui.design@example.test', 'This is not the isolated test account.');
  }
  await page.getByRole('button', {name:'Clientes',exact:true}).click();
  await page.getByRole('button', {name:'Nuevo cliente'}).click();
  const unique = Date.now().toString().slice(-8);
  const customer = `José Pérez — Transportes y Servicios ${unique}`;
  await page.getByLabel('Nombre completo').fill(customer);
  await page.getByLabel('Teléfono').fill('55551234');
  // Failed writes preserve the form and entered values.
  await page.route('**/api/customers', route => route.request().method()==='POST'
    ? route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Fallo de prueba: intenta de nuevo."}'}) : route.continue());
  await page.getByRole('button', {name:'Guardar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Fallo de prueba'}).waitFor();
  assert(await page.getByLabel('Nombre completo').inputValue() === customer, 'Lost customer input after failed save');
  await page.unroute('**/api/customers');
  // Saving blocks duplicate submission and Escape until the result is known.
  let release, started;
  const startedPromise = new Promise(resolve => started=resolve);
  const gate = new Promise(resolve => release=resolve);
  await page.route('**/api/customers', async route => {
    if(route.request().method()==='POST'){started();await gate;await route.continue();}
    else await route.abort('failed');
  });
  await page.getByRole('button', {name:'Guardar',exact:true}).click();
  await startedPromise;
  assert(await page.getByRole('button',{name:'Guardando…'}).isDisabled(), 'Save button is not disabled');
  await page.keyboard.press('Escape');
  assert(await page.locator('#modal').isVisible(), 'Escape dismissed an in-flight write');
  release();
  await page.locator('#modal').waitFor({state:'hidden'});
  await page.locator('#toast').filter({hasText:'El registro se guardó'}).waitFor();
  await page.unroute('**/api/customers');
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await page.getByRole('cell',{name:customer,exact:true}).waitFor();
  await page.getByLabel('Buscar registros').fill('jose perez');
  assert(await page.getByRole('cell',{name:customer,exact:true}).isVisible(), 'Search does not normalize accents');
  await page.getByLabel('Buscar registros').fill('not-a-customer');
  await page.getByText('No hay coincidencias.',{exact:false}).waitFor();
  await page.getByLabel('Buscar registros').fill('');

  await page.getByRole('button',{name:'Vehículos',exact:true}).click();
  await page.getByRole('button',{name:'Nuevo vehículo'}).click();
  await page.getByLabel('Propietario').selectOption({label:customer});
  await page.getByLabel('Placa',{exact:true}).fill('UI-'+unique);
  await page.getByLabel('Marca',{exact:true}).fill('Toyota');
  await page.getByLabel('Modelo',{exact:true}).fill('Hilux');
  await page.getByLabel('Kilometraje',{exact:true}).fill('48000');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.locator('#modal').waitFor({state:'hidden'});
  await page.getByRole('cell',{name:'UI-'+unique,exact:false}).waitFor();
  await page.getByRole('button',{name:'Órdenes de servicio',exact:true}).click();
  await page.getByRole('button',{name:'Recibir vehículo'}).click();
  const vehicleOptions=await page.getByLabel('Vehículo',{exact:true}).locator('option').allTextContents();
  await page.getByLabel('Vehículo',{exact:true}).selectOption({label:vehicleOptions.find(x=>x.includes('UI-'+unique))});
  await page.getByLabel('Motivo de ingreso').fill('Revisión de frenos y mantenimiento preventivo.');
  await page.getByRole('button',{name:'Crear orden'}).click();
  await page.getByRole('heading',{name:'Acceso de seguimiento'}).waitFor();
  const trackingLink=await page.getByRole('link',{name:'Abrir seguimiento'}).getAttribute('href');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar QR'}).click();
  assert((await downloadPromise).suggestedFilename().endsWith('.svg'),'QR download failed');
  await page.getByRole('button',{name:'Cerrar ventana'}).click();
  const orderUrl=page.url();
  const changeStatus=async status=>{
    await page.getByRole('button',{name:'Cambiar estado'}).click();
    await page.getByLabel('Siguiente estado').selectOption(status);
    await page.getByRole('button',{name:'Guardar',exact:true}).click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.locator('.page-head .badge').filter({hasText:status==='Diagnostico'?'Diagnóstico':'Cotización'}).waitFor();
  };
  await changeStatus('Diagnostico');
  await page.getByRole('button',{name:'Diagnóstico',exact:true}).click();
  await page.getByRole('button',{name:'+ Diagnóstico',exact:true}).click();
  await page.getByLabel('Problema encontrado').fill('Desgaste de pastillas de freno delanteras.');
  await page.getByLabel('Causa probable o identificada').fill('Desgaste por uso normal.');
  await page.getByLabel('Recomendación',{exact:true}).fill('Reemplazar pastillas y comprobar frenado.');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await page.locator('#modal').waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Desgaste de pastillas de freno delanteras.'}).waitFor();
  await changeStatus('Cotizacion');
  await page.getByRole('button',{name:'Cotizaciones',exact:true}).click();
  await page.getByRole('button',{name:'Nueva versión'}).click();
  await page.getByLabel('Descripción del concepto').fill('Pastillas y mano de obra');
  await page.getByLabel('Cantidad',{exact:true}).fill('2.5');
  await page.getByLabel('Precio unitario').fill('123.45');
  await page.getByLabel('Descuento',{exact:true}).fill('10');
  await page.getByLabel('Impuesto (%)').fill('12');
  assert((await page.locator('#quote-totals').innerText()).includes('334.47'),'Quote preview differs from server rounding');
  await page.getByLabel('Descuento',{exact:true}).fill('900');
  assert(await page.getByLabel('Descuento',{exact:true}).evaluate(el=>!el.checkValidity()),'Excessive discount accepted');
  await page.getByLabel('Descuento',{exact:true}).fill('10');
  assert(await page.getByLabel('Descuento',{exact:true}).evaluate(el=>el.checkValidity()),'Discount stays invalid after correction');
  await page.getByRole('button',{name:'Agregar concepto'}).click();
  assert(await page.getByLabel('Descripción del concepto').last().evaluate(el=>el===document.activeElement),'New quote line did not get focus');
  await page.getByRole('button',{name:'Eliminar concepto'}).last().click();
  await page.screenshot({path:'.artifacts/quote-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'.artifacts/quote-mobile.png'});
  assert(await page.getByLabel('Precio unitario').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),'Mobile input causes auto zoom');
  await page.getByRole('button',{name:'Guardar cotización'}).click();
  await page.locator('#modal').waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Cotización · Versión 1'}).waitFor();
  assert((await page.locator('#order-panel .total').innerText()).includes('334.47'),'Saved quote differs from preview');
  await page.getByRole('button',{name:'Abrir menú'}).click();
  assert(await page.getByRole('dialog',{name:'Menú del taller'}).isVisible(),'Mobile menu did not open');
  for(let i=0;i<14;i++)await page.keyboard.press('Tab');
  assert(await page.evaluate(()=>!!document.activeElement.closest('#nav-dialog')),'Menu focus escaped');
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'Abrir menú'}).evaluate(el=>el===document.activeElement),'Menu did not restore focus');
  await page.getByRole('button',{name:'Abrir menú'}).click();
  await page.getByRole('dialog',{name:'Menú del taller'}).getByRole('button',{name:'Resumen',exact:true}).click();
  await page.getByRole('heading',{name:'Todo el taller, bajo control.'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page overflows');
  await page.screenshot({path:'.artifacts/dashboard-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'.artifacts/dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:820,height:1000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Tablet page overflows');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert(await page.locator('#toast').evaluate(el=>getComputedStyle(el).transitionDuration==='0s'),'Reduced motion still animates');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // A slow order fetch must not overwrite a later navigation.
  await page.setViewportSize({width:1440,height:1000});
  let releaseOrder, requestOrder;
  const orderGate=new Promise(resolve=>releaseOrder=resolve), orderStarted=new Promise(resolve=>requestOrder=resolve);
  const orderPath='**/api/orders/'+orderUrl.split('/').pop();
  await page.route(orderPath,async route=>{requestOrder();await orderGate;await route.continue();});
  await page.goto(orderUrl);
  await orderStarted;
  await page.getByRole('button',{name:'Clientes',exact:true}).click();
  await page.getByRole('heading',{name:'Clientes',exact:true}).waitFor();
  releaseOrder();await page.waitForResponse(r=>r.url().endsWith('/api/orders/'+orderUrl.split('/').pop()));
  await page.unroute(orderPath);
  await page.getByRole('heading',{name:'Clientes',exact:true}).waitFor();
  // Customer portal preserves the displayed order on a temporary network error.
  await page.goto(trackingLink);
  await page.getByRole('heading',{name:'Toyota Hilux'}).waitFor();
  await page.route('**/api/tracking/order',route=>route.abort('failed'));
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'No hay conexión'}).waitFor();
  assert(await page.getByRole('heading',{name:'Toyota Hilux'}).isVisible(),'Portal loses order on temporary failure');
  await page.unroute('**/api/tracking/order');
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await page.locator('#portal-error').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile portal overflows');
  await page.screenshot({path:'.artifacts/portal-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Salir',exact:true}).click();
  await page.getByRole('heading',{name:'Consulta tu vehículo'}).waitFor();
  assert(errors.length===0,errors.join('\n'));
  console.log('PASS: save recovery, duplicate protection, catalog search, reception/QR, diagnosis, quote totals, mobile/keyboard, route race and portal recovery.');
}
