/**
 *  @class
 *  @function FacetsToggle
 */
class FacetToggle extends HTMLElement {

  constructor() {
    super();
    this.init();
  }
  init() {
    this.drawer = document.getElementById('Facet-Drawer');
    this.container = this.closest('.facets--bar-sticky');

    // Add functionality to buttons
    this.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.toggle('open-cc');
      this.drawer.classList.toggle('active');
    });
    if (this.container) {
      this.enableSticky();
    }

  }
  enableSticky() {
    let rootMargin = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) + 1;
    this.observer = new IntersectionObserver(
      ([e]) => {
        e.target.classList.toggle('is-pinned', e.intersectionRatio <= 1 && e.intersectionRatio > 0);
      },
      {
        threshold: [1],
        rootMargin: `-${rootMargin}px 0px 0px 0px`
      }
    );

    this.observer.observe(this.container);
  }

}
customElements.define('facet-toggle', FacetToggle);

/**
 *  @class
 *  @function FacetFiltersForm
 */
class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      if (event.target.id === 'compare_toggle') {
        return;
      }
      this.onSubmitHandler(event);
    }, 500);

    this.querySelector('form').addEventListener('input', this.debouncedOnSubmit.bind(this));
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const container = document.getElementsByClassName('thb-filter-count');
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');

    for (var item of container) {
      item.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      if (FacetFiltersForm.filterData.some(filterDataUrl)) {
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event);
      } else {
        FacetFiltersForm.renderSectionFromFetch(url, event);
      }
    });
    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then(response => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, {
          html,
          url
        }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
  }

  static renderProductCount(html) {
    const countHtml = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
    const container = document.getElementsByClassName('thb-filter-count');

    if (countHtml) {
      for (var item of container) {
        item.innerHTML = countHtml.innerHTML;
        item.classList.remove('loading');
      }
    }

  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements =
      parsedHTML.querySelectorAll('#FacetFiltersForm collapsible-row, #FacetFiltersFormMobile collapsible-row');
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('collapsible-row') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(`collapsible-row[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('collapsible-row'));
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-filter-count'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      }];
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const formData = new FormData(event.target.closest('form'));
    const searchParams = new URLSearchParams(formData);
    if (searchParams.get('filter.v.price.gte') === "0.00") {
      searchParams.delete('filter.v.price.gte');
    }
    if (document.querySelector('.price_slider')) {
      if (searchParams.get('filter.v.price.lte') === parseFloat(document.querySelector('.price_slider').dataset.max).toFixed(2)) {
        searchParams.delete('filter.v.price.lte');
      }
    }
    FacetFiltersForm.renderPage(searchParams.toString(), event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

/**
 *  @class
 *  @function Facetremove
 */
class FacetRemove extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('a').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
        form.onActiveFilterClick(event);
      });
    });
  }
}

customElements.define('facet-remove', FacetRemove);

/**
 *  @class
 *  @function FacetToolbar
 */
class FacetToolbar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.compareToggle = this.querySelector('#compare_toggle');
    if (this.compareToggle) {
      this.compareToggle.addEventListener('change', this.onCompare);
    }
  }
  onCompare(e) {
    document.body.classList.toggle('compare-true');
    e.preventDefault();
    return false;
  }
}
customElements.define('facet-toolbar', FacetToolbar);

/**
 *  @class
 *  @function PriceSlider
 */
class PriceSlider extends HTMLElement {

  constructor() {
    super();
  }
  connectedCallback() {
    let slider = this.querySelector('.price_slider'),
      amounts = this.querySelector('.price_slider_amount'),
      args = {
        start: [parseFloat(slider.dataset.minValue || 0), parseFloat(slider.dataset.maxValue || slider.dataset.max)],
        connect: true,
        step: 10,
        direction: document.dir,
        handleAttributes: [
          { 'aria-label': 'lower' },
          { 'aria-label': 'upper' },
        ],
        range: {
          'min': 0,
          'max': parseFloat(slider.dataset.max)
        }
      },
      event = new CustomEvent('input'),
      form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');

    if (slider.classList.contains('noUi-target')) {
      slider.noUiSlider.destroy();
    }
    noUiSlider.create(slider, args);

    slider.noUiSlider.on('update', function (values) {
      amounts.querySelector('.field__input_min').value = values[0];
      amounts.querySelector('.field__input_max').value = values[1];
    });
    slider.noUiSlider.on('change', function (values) {
      form.querySelector('form').dispatchEvent(event);
    });
  }
}
customElements.define('price-slider', PriceSlider);