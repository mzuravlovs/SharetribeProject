import React from 'react';
import { string, func, bool, oneOfType } from 'prop-types';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { useConfiguration } from '../../context/configurationContext';

import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import { displayPrice } from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { propTypes } from '../../util/types';
import { formatMoney } from '../../util/currency';
import { ensureListing, ensureUser } from '../../util/data';
import { richText } from '../../util/richText';
import { createSlug } from '../../util/urlHelpers';
import { isBookingProcessAlias } from '../../transactions/transaction';
import { calculateDistance } from '../../util/distance'; // Import a utility function to calculate distance

import { AspectRatioWrapper, NamedLink, ResponsiveImage } from '../../components';

import css from './ListingCard.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 10;

const priceData = (price, currency, intl, deliveryPricePerKm) => {
  if (price && price.currency === currency) {
    const formattedPrice = formatMoney(intl, price);
    return { formattedPrice, priceTitle: formattedPrice };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTitle: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

const PriceMaybe = props => {
  const { price, publicData, config, intl } = props;
  const { listingType } = publicData || {};
  const validListingTypes = config.listing.listingTypes;
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  const showPrice = displayPrice(foundListingTypeConfig);
  if (!showPrice && price) {
    return null;
  }

  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);
  const { formattedPrice, priceTitle } = priceData(price, config.currency, intl);
  return (
    <div className={css.price}>
      <div className={css.priceValue} title={priceTitle}>
        {formattedPrice}
      </div>
      {isBookable ? (
        <div className={css.perUnit}>
          <FormattedMessage id="ListingCard.perUnit" values={{ unitType: publicData?.unitType }} />
        </div>
      ) : null}
      
    </div>
  );
};

export const ListingCardComponent = props => {
  const config = useConfiguration();
  const {
    className,
    rootClassName,
    intl,
    listing,
    renderSizes,
    setActiveListing,
    showAuthorInfo,
    constructionSiteLocation,
    attributes,
  } = props;
  const classes = classNames(rootClassName || css.root, className);
  const currentListing = ensureListing(listing);
  const id = currentListing.id.uuid;
  const { title = '', price, publicData } = currentListing.attributes;
  const slug = createSlug(title);
  const author = ensureUser(listing.author);
  const authorName = author.attributes.profile.displayName;
  const firstImage =
    currentListing.images && currentListing.images.length > 0 ? currentListing.images[0] : null;

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const deliveryPricePerKm = listing.attributes.publicData.deliveryPricePerKm || 0;
  const itemLocation = listing.attributes.geolocation || { lat: 0, lng: 0 }; // Default to a valid location

  console.log('constructionSiteLocation:', constructionSiteLocation);
  console.log('Listing Fields:', listing.fields);
  console.log('itemLocation:', itemLocation);
  console.log('Listing data:', listing);
  console.log('Listing attributes:', listing.attributes);
  console.log('Author 3:', author.attributes.profile);

  const distance = constructionSiteLocation ? calculateDistance(itemLocation, constructionSiteLocation) : 0;
  const deliveryCost = deliveryPricePerKm * distance * 2;
  const totalCost = price.amount + deliveryCost;

  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(currentListing.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  return (
    <NamedLink className={classes} name="ListingPage" params={{ id, slug }}>
      <AspectRatioWrapper
        className={css.aspectRatioWrapper}
        width={aspectWidth}
        height={aspectHeight}
        {...setActivePropsMaybe}
      >
        <LazyImage
          rootClassName={css.rootForImage}
          alt={title}
          image={firstImage}
          variants={variants}
          sizes={renderSizes}
        />
      </AspectRatioWrapper>
      <div className={css.info}>
        <PriceMaybe price={price} publicData={publicData} config={config} intl={intl} />
        <div className={css.mainInfo}>
          <div className={css.title}>
            {richText(title, {
              longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
              longWordClass: css.longWord,
            })}
          </div>
          <div className={css.deliveryCost}>
            Delivery Cost: {intl.formatNumber(deliveryCost, { style: 'currency', currency: price.currency })} ({distance.toFixed(2)} km)
          </div>
          <div className={css.totalCost}>
            Total Cost: {intl.formatNumber(totalCost, { style: 'currency', currency: price.currency })}
          </div>
          <div className={css.totalCost}>
            Total Cost: {deliveryPricePerKm || 'blja'}
          </div>
          {showAuthorInfo ? (
            <div className={css.authorInfo}>
              <FormattedMessage id="ListingCard.author" values={{ authorName }} />
            </div>
          ) : null}

                        
<p>wtf</p>
{deliveryPricePerKm ? (
        <div className="deliveryPrice">
          Delivery: {formatMoney(listing.attributes.price.currency, deliveryPricePerKm)}/km
        </div>
      ) : null}
        </div>
      </div>
    </NamedLink>
  );
};

ListingCardComponent.defaultProps = {
  className: null,
  rootClassName: null,
  renderSizes: null,
  setActiveListing: null,
  showAuthorInfo: true,
};

ListingCardComponent.propTypes = {
  className: PropTypes.string,
  rootClassName: PropTypes.string,
  intl: intlShape.isRequired,
  listing: PropTypes.shape({
    id: PropTypes.shape({
      uuid: PropTypes.string.isRequired,
    }).isRequired,
    attributes: PropTypes.shape({
      title: PropTypes.string.isRequired,
      price: PropTypes.shape({
        amount: PropTypes.number.isRequired,
        currency: PropTypes.string.isRequired,
      }).isRequired,
      publicData: PropTypes.shape({
        deliveryPricePerKm: PropTypes.number,
        location: PropTypes.shape({
          lat: PropTypes.number,
          lng: PropTypes.number,
        }),
        images: PropTypes.arrayOf(
          PropTypes.shape({
            variants: PropTypes.object.isRequired,
          })
        ).isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
  showAuthorInfo: PropTypes.bool,
  renderSizes: PropTypes.string,
  setActiveListing: PropTypes.func,
  constructionSiteLocation: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
};

export default injectIntl(ListingCardComponent);