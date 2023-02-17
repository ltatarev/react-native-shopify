# 🛍️ React Native Shopify

[![npm version](https://img.shields.io/npm/v/react-native-shopify)](https://www.npmjs.com/package/shopify)

Easily integrate Shopify into your React Native app. Based on Shopify's Mobile Buy SDK. ([iOS](https://github.com/Shopify/mobile-buy-sdk-ios)/[Android](https://github.com/Shopify/mobile-buy-sdk-android/))

## Installation

Using npm:

```
$ npm install react-native-shopify --save
```

or yarn:

```
$ yarn add react-native-shopify
```

In case you're using React Native <0.60, or need to manually install the library, follow manual installation steps below.

<details>
<summary>🆘 Manual installation</summary>

#### iOS

```sh
  target 'YourAwesomeProject' do
    # …
    pod 'RNShopify', :path => '../node_modules/react-native-shopify'
  end
```

#### Android

1. Add the import and link the package in `MainActivity.java`

   ```java
    import com.reactnativeshopify.RNShopifyPackage; // <- add RNShopify import

    public class MainApplication extends Application implements ReactApplication {

      // …

      @Override
      protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // …
        packages.add(new RNShopifyPackage()); // <- add RNShopify package
        return packages;
      }

      // …
   }
   ```

2. Append the following lines to `android/settings.gradle`:

   ```java
   include ':react-native-shopify'
   project(':react-native-shopify').projectDir = new File(rootProject.projectDir,  '../node_modules/react-native-shopify/android')
   ```

3. Insert the following lines inside the dependencies block in `android/app/build.gradle`:

   ```java
   dependencies {
      // ...
      implementation project(':react-native-shopify')
    }
   ```

   </details>

## API

The library exposes API to methods below. All methods are async and should be awaited. Certain methods support pagination by accepting `cursor` value from the last fetched item.

#### `initStore(shopDomain, apiKey)`

To initialize the store, call the `initStore()` method and pass your shop domain and api key.

```javascript
import Shopify from 'react-native-shopify';

Shopify.initStore('yourshopifystore.myshopify.com', 'YOUR API KEY');
```

#### `getShop()`

#### `getCollections(cursor)`

Fetches first 25 collections after cursor. If cursor isn't defined, fetches first 25 collections.

#### `filterProducts(query)`

Fetches products filtered with query. If query isn't defined, fetches first 250 products. Supported query fields can be found on [Shopify API](https://shopify.dev/api/admin-graphql/2022-04/queries/products#argument-products-query).

#### `getProductsForCollection(collectionId)`

#### `createCheckoutWithCartAndClientInfo(cart, userInfo)`

#### `createCustomer(customerInfo)`

Creates a Shopify customer with given info. If successful, customer can login into your Shopify store.

<details>
<summary>Arguments</summary>

| `customerInfo` prop | type      | required | default value |
| ------------------- | --------- | -------- | ------------- |
| `email`             | `string`  | ✅       |               |
| `password`          | `string`  | ✅       |               |
| `firstName`         | `string`  |          | `''`          |
| `lastName`          | `string`  |          | `''`          |
| `acceptsMarketing`  | `boolean` |          | false         |

</details>

#### `getOrderByName(orderName, lineItemsCursor)`

#### `getOrderHistory(pageSize, cursor)`

<details>
<summary>Arguments</summary>

| props      | type     | required | default value |
| ---------- | -------- | -------- | ------------- |
| `pageSize` | `number` |          | 25            |
| `cursor`   | `string` |          | `null`        |

</details>

#### `login(userInfo)`

After login, customer access token is saved to device keychain and is handled natively by this library.

#### `refreshToken()`

Refreshes token for currently logged in user.

#### `isLoggedIn()`

Checks if there's currently logged in customer by checking if customer access token exists in keychain.

#### `logout()`

Removes currently stored customer access token from keychain.

#### `getCustomer(addressCursor)`

Retrieves data about currently logged in customer. Pagination is possible by sending `addressCursor`.

#### `updateCustomer(userInfo)`

#### `associateCheckout(checkoutId)`

For a given checkout ID, associates currently logged in customer with the checkout, creating more seamless experience for the customer.

## Usage

### Fetch shop data, collections and tags

```javascript
Shopify.getShop()
  .then((shop) => {
    // Save the shop somewhere and use it to display currency and other info
    return getAllCollections();
  })
  .then((collections) => {
    // Do something with collections
    return getAllTags();
  })
  .then((tags) => {
    // And tags...
  });
```

Collections and tags from Shopify should be fetch recursively since each query is
limited to 25 results by the SDK. Here are some methods to help you out:

```javascript
const getAllCollections = (page = 1, allCollections = []) =>
  Shopify.getCollections(page).then((collections) => {
    if (_.size(collections)) {
      return getAllCollections(page + 1, [...allCollections, ...collections]);
    }
    return allCollections;
  });

// The same goes for tags...

const getAllTags = (page = 1, allTags = []) =>
  Shopify.getProductTags(page).then((tags) => {
    if (_.size(tags)) {
      return getAllTags(page + 1, [...allTags, ...tags]);
    }
    return allTags;
  });
```

At last, fetch the first page (25) of products:

```javascript
Shopify.getProducts().then((products) => {
  // Show products to your users
});
```

You can also fetch products for a specific page and collection ID

```javascript
Shopify.getProducts(2, collectionId).then((products) => {});
```

### Search products by tags

```javascript
Shopify.getProducts(1, collectionId, ['t-shirts']).then((products) => {});
```

### Add products to cart and proceed to checkout

A product has several variants. For example, a sweater in various sizes and colors. You add
variants for products to the cart. A cart item is defined as a tuple of _item_, _variant_ and _quantity_.

You can perform a native or web checkout. Library currently doesn't support native checkout.
Web checkout can be easily added to your app by opening WebView with `webUrl` provided by `createCheckoutWithCartAndClientInfo`or `associateCheckout` for logged in users.
If you want customers to be logged in when opening web checkout, make sure to pass
`'X-Shopify-Customer-Access-Token': ${customerAccessToken}` in WebView headers.

```javascript
// Add the first variant of the first fetched product, times 2:
Shopify.getProducts().then((products) => {
  const firstProduct = products[0];

  // Note that you should set product and variant objects, not IDs.
  // Also note that the key for product is item
  const cartItem = {
    item: firstProduct,
    variant: firstProduct.variants[0],
    quantity: 2,
  };
});
```

### Roadmap

- Apple Pay & Google Pay
- TypeScript support
