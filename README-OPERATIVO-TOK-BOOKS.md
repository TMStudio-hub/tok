# TO-K BOOKS: guia operativa de uso

Este documento deja TO-K BOOKS listo para usar y para entregar.

## 1. Estado recomendado

- Pantalla principal: `tok-books-beta.html`
- Snapshot operativo alternativo: `tok-books-ready.html`
- Commit base validado: `9ff3998`
- Idiomas de busqueda soportados: `ES`, `EN`, `DE`
- Flujo de busqueda activo: Google primero, catalogo local como apoyo y alta manual cuando los catalogos externos fallan o no devuelven paginas.

## 2. Como activar BOOKS

### Caso A. Primer TO-K de una familia

Usar cuando el cliente compra solo BOOKS o cuando BOOKS inicia el nucleo familiar.

Pasos:

1. El chip o QR debe abrir BOOKS con su `aid`.
2. El cliente introduce el token familiar del regalo.
3. BOOKS crea la familia, enlaza el `AID`, marca el token como usado y entra al onboarding.
4. El cliente pone nombre a su biblioteca y ya puede usarla.

### Caso B. La familia ya tiene TO-K HOME

Usar cuando BOOKS se suma a una familia ya existente.

Pasos:

1. El cliente abre BOOKS desde el chip o QR.
2. En lugar del token, pega el codigo del hogar.
3. BOOKS enlaza su biblioteca al mismo `FID` familiar.
4. Los avisos de lectura quedan conectados al hogar.

## 3. Como se usa en el dia a dia

1. Elegir idioma arriba: `ES`, `EN` o `DE`.
2. Buscar por titulo o autor.
3. Si el libro aparece, tocar el resultado para meterlo en lectura.
4. Si solo interesa guardarlo para mas tarde, usar `+ Deseos`.
5. Si el catalogo no trae paginas, escribirlas en el campo `total` dentro de la ficha del libro activo.
6. Guardar progreso cada vez que cambian las paginas leidas.
7. Al llegar al 100%, BOOKS pasa el libro a terminados y suma puntos.

## 4. Como responde la busqueda

- En `ES`, prioriza resultados en espanol.
- En `EN`, prioriza ingles.
- En `DE`, prioriza aleman.
- Si Google va lento o falla, BOOKS sigue mostrando catalogo local y permite alta manual.
- Si un libro ya se busco antes o ya estuvo en lectura, deseos o terminados, es mas facil que vuelva a salir aunque fallen los catalogos externos.

## 5. Que hacer si no encuentra un libro

1. Esperar unos segundos por si Google tarda.
2. Cambiar el idioma si la edicion buscada suele estar en otro idioma.
3. Usar `Anadir manualmente` si el titulo no aparece.
4. Si falta el numero de paginas, ponerlo luego desde la ficha del libro activo.

## 6. Checklist antes de entregar un BOOKS

- El `AID` existe en `admin/assets/{aid}`.
- El `AID` no esta ya activo ni enlazado a otra familia.
- El token familiar existe en `admin/familyTokens/{token}` y esta `available`.
- Si hay `orderId`, coincide entre asset y token.
- El chip o QR abre la URL correcta del BOOKS con `aid`.
- Se ha probado una activacion limpia o una conexion a hogar en una sesion sin cache vieja.

## 7. URLs de uso

### URL publica habitual

`https://tmstudio-hub.github.io/tok/tok-books-beta.html`

Esta es la URL publica ya validada en uso real.

### URL publica alternativa de trabajo

`https://tmstudio-hub.github.io/tok/tok-books-ready.html`

La segunda existe para dar una ruta nueva de despliegue cuando la primera tarde en propagar cambios, pero puede tardar unos minutos en aparecer tras el push a GitHub Pages.

## 8. Incidencias conocidas y decision operativa

- GitHub Pages puede tardar en servir la ultima version de `tok-books-beta.html` aunque GitHub ya tenga el commit correcto.
- Por eso se mantiene `tok-books-ready.html` como ruta de salida limpia para pruebas y entregas cuando haga falta una URL nueva, aunque no siempre aparece al instante.
- Si ambas rutas muestran lo mismo, se puede seguir usando la `beta` como principal.

## 9. Decision recomendada

- Para entrega inmediata: usar `tok-books-beta.html`, que ya esta validada publicamente.
- Para operativa normal: mantener `tok-books-beta.html` como principal y `tok-books-ready.html` como respaldo de despliegue cuando Pages la publique.
- Para el cliente final: no explicar la arquitectura interna; solo darle el chip o QR y, si hace falta, el codigo del hogar o el token familiar.
