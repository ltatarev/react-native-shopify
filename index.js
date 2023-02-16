import { NativeModules, Platform } from 'react-native';
import _ from 'lodash';

const { RNShopify } = NativeModules;

/*
 * We use this function to clean the information coming from the native side
 * this only affects to Android which send so much garbage that we don't need
 */
const cleanUp = Platform.select({
  ios: a => a,
  android: (obj, parse = false) => {
    // 1st level come as a JSON string, we assume we
    // need to parse it to a JSON pbject

    if (parse) {
      obj = JSON.parse(obj);
      if (obj.responseData) obj = obj.responseData;
    }

    /*
     * For each key let's see if is an object, if it's a valid object for lodash
     * if it has a responseData and justreturn it, otherwise the ID's from
     * android is an object containing ID so we just need to pass that value and
     * then just do a clean up and reassign the key with the cleared object
     */
    _.each(_.keys(obj), k => {
      let o = obj[k];
      if (_.isObject(o)) {
        if (o.responseData) {
          o = o.responseData;
        } else if (o.id) {
          o = o.id;
        }
        obj[k] = cleanUp(o);
      }
    });
    return obj;
  },
});

// That's a helper to get the array of nodes from edges
const getNodesFromEdges = (container, prop) => {
  container[prop] = _.map(_.get(container, `${prop}.edges`), 'node');
  return container;
};
const getNodesFromEdgesProperties = (container, ...properties) => {
  _.each(properties, prop => {
    container = getNodesFromEdges(container, prop);
  });
  return container;
};

const productsResolver = accept => container => {
  const p2 = _.map(
    _.get(cleanUp(container, true), 'node.products.edges'),
    product => getNodesFromEdgesProperties(product.node, 'images', 'variants'),
  );
  accept(p2);
};

const productsSearchResolver = accept => shop => {
  const products = _.map(_.get(cleanUp(shop, true), 'products.edges'), 'node');
  const p2 = _.map(products, p =>
    getNodesFromEdgesProperties(p, 'images', 'variants'),
  );
  accept(p2);
};

export const SHOPIFY_ERRORS = {
  UNKNOWN_CUSTOMER: 'Unidentified customer',
};

const DEFAULT_PAGE_SIZE = 25;

function cleanUpAddresses(customer) {
  if (!customer) {
    return [];
  }

  const cleanResponse = cleanUp(customer, true);
  const { edges, pageInfo } = _.get(cleanResponse, 'customer.addresses', {});
  const { cursor } = _.last(edges);

  // Map addresses
  const addresses = _.reduce(
    edges,
    (result, current) => {
      const { node } = current;

      result.push(node);

      return result;
    },
    [],
  );

  return {
    customer: {
      ...customer.customer,
      addresses,
      addressesPageInfo: { ...pageInfo, cursor },
    },
  };
}

function cleanUpOrders(orders) {
  if (!orders) {
    return [];
  }

  const cleanResponse = cleanUp(orders, true);
  const edges = _.get(cleanResponse, 'customer.orders.edges');

  // Map line items
  return _.reduce(
    edges,
    (result, current) => {
      const { cursor, node } = current;
      const { lineItems } = node;
      const cleanLineItems = _.map(lineItems.edges, edge => edge.node);

      const currentOrder = {
        ...node,
        cursor,
        lineItems: cleanLineItems,
        lineItemsPageInfo: {
          cursor: _.last(lineItems.edges).cursor,
          hasNextPage: lineItems.pageInfo.hasNextPage,
        },
      };

      result.push(currentOrder);

      return result;
    },
    [],
  );
}

async function resolveOrderHistory(orders) {
  if (!orders) {
    return [];
  }

  const cleanResponse = cleanUp(orders, true);
  const edges = _.get(cleanResponse, 'customer.orders.edges');
  const { cursor: newCursor } = _.last(edges);
  const pageInfo = _.get(cleanResponse, 'customer.orders.pageInfo');

  return {
    orders: cleanUpOrders(orders),
    pageInfo: { ...pageInfo, cursor: newCursor },
  };
}

export default {
  initStore: (shop, apiKey) =>
    new Promise((accept, reject) => {
      RNShopify.initStore(shop, apiKey)
        .then(o => accept(cleanUp(o, true)))
        .catch(reject);
  }),
  getShop: () =>
    new Promise((accept, reject) => {
      RNShopify.getShop()
        .then(o => accept(cleanUp(o, true)))
        .catch(reject);
    }),
  getCollections: () =>
    new Promise((accept, reject) => {
      let resolvedCollections = [];
      const addCollections = collections => {
        const response = cleanUp(collections, true);
        const edges = _.get(response, 'edges');
        const data = _.map(edges, 'node');

        if (data.length > 0) {
          resolvedCollections = _.concat(resolvedCollections, data);
        }

        if (response.pageInfo.hasNextPage) {
          const { cursor } = _.last(edges);
          RNShopify.getCollections(cursor)
            .then(addCollections)
            .catch(reject);
        } else {
          accept(resolvedCollections);
        }
      };

      RNShopify.getCollections('')
        .then(addCollections)
        .catch(reject);
    }),
  getProductsForCollection: collectionId =>
    new Promise((accept, reject) => {
      RNShopify.getProductsForCollection(collectionId)
        .then(productsResolver(accept))
        .catch(reject);
    }),
  filterProducts: filter =>
    new Promise((accept, reject) => {
      RNShopify.filterProducts(filter)
        .then(productsSearchResolver(accept))
        .catch(reject);
    }),
  createCheckoutWithCartAndClientInfo: (cart, userInfo) =>
    new Promise((accept, reject) => {
      RNShopify.createCheckoutWithCartAndClientInfo(cart, userInfo)
        .then(o => accept(cleanUp(o, true)))
        .catch(reject);
    }),
  associateCheckout: checkoutId =>
    new Promise((accept, reject) => {
      RNShopify.associateCheckout(checkoutId)
        .then(o => accept(cleanUp(o, true)))
        .catch(reject);
    }),
  createCustomer: customer =>
    new Promise((accept, reject) =>
      RNShopify.createCustomer(customer)
        .then(o => accept(cleanUp(o, true)))
        .catch(reject),
    ),
  login: (email, password) =>
    new Promise((accept, reject) =>
      RNShopify.login({ email, password })
        .then(() => accept())
        .catch(reject),
    ),
  refreshToken: () =>
    new Promise((accept, reject) =>
      RNShopify.refreshToken()
        .then(o => accept(o))
        .catch(reject),
    ),
  getAccessToken: () =>
    new Promise((accept, reject) =>
      RNShopify.getAccessToken()
        .then(o => accept(o))
        .catch(reject),
    ),
  getCustomer: (addressCursor = '') =>
    new Promise((accept, reject) =>
      RNShopify.getCustomer(addressCursor)
        .then(res => cleanUpAddresses(res))
        .then(o => accept(o))
        .catch(reject),
    ),
  logout: () =>
    new Promise((accept, reject) =>
      RNShopify.logout()
        .then(() => accept())
        .catch(reject),
    ),
  getOrders: (pageSize = DEFAULT_PAGE_SIZE, cursor = '') =>
    new Promise((accept, reject) =>
      RNShopify.getOrderHistory(pageSize, cursor)
        .then(orders => resolveOrderHistory(orders))
        .then(o => accept(o))
        .catch(reject),
    ),
  getOrderByOrderName: (orderName, cursor = '') =>
    new Promise((accept, reject) =>
      RNShopify.getOrderByName(orderName, cursor)
        .then(res => cleanUpOrders(res))
        .then(o => accept(o))
        .catch(reject),
    ),
};
