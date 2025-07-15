document.addEventListener('DOMContentLoaded', function() {
  // --- Таби
  var buttons = document.querySelectorAll('.tabs__button[data-tab-target]');
  var panels  = document.querySelectorAll('.tabs__panel[data-tab-content]');
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      buttons.forEach(function(b) {
        b.classList.remove('tabs__button--active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(function(p) {
        p.hidden = true;
      });
      btn.classList.add('tabs__button--active');
      btn.setAttribute('aria-selected', 'true');
      var panel = document.getElementById(btn.dataset.tabTarget);
      if (panel) panel.hidden = false;
    });
  });

  // --- Метадані варіантів
  var metafieldsData = [];
  try {
    metafieldsData = JSON.parse(document.getElementById('product-variants-metafields').textContent);
  } catch (e) {}

  function updateMetafields(variantId) {
    var metafields = metafieldsData.find(function(v) { return v.id == variantId; });
    if (!metafields) return;
    Object.keys(metafields).forEach(function(key) {
      if (key === "id" || key === "sku") return;
      var el = document.querySelector('#variant-metafields [data-metafield="'+key+'"]');
      if (el) {
        var li = el.closest('li');
        if (metafields[key] && metafields[key] !== "" && metafields[key] !== "null" && metafields[key] !== null) {
          el.textContent = metafields[key];
          if (li) li.style.display = "";
        } else {
          el.textContent = "";
          if (li) li.style.display = "none";
        }
      }
    });

    // --- SKU
    var skuRow = document.getElementById('variant-sku-row');
    var skuEl = document.getElementById('variant-sku');
    if (skuEl && skuRow) {
      if (metafields.sku && metafields.sku !== "" && metafields.sku !== "null" && metafields.sku !== null) {
        skuEl.textContent = metafields.sku;
        skuRow.style.display = "";
      } else {
        skuEl.textContent = "";
        skuRow.style.display = "none";
      }
    }
  }

  // --- Основна функція отримання поточного variant.id
  function getCurrentVariantId() {
    var form = document.querySelector('form[action^="/cart/add"]');
    if (!form) return null;
    var variantInput = form.querySelector('input[name="id"], select[name="id"]');
    if (variantInput) {
      return variantInput.value;
    }
    return null;
  }

  // --- Оновити при завантаженні
  var currentVariantId = getCurrentVariantId();
  if (currentVariantId) updateMetafields(currentVariantId);

  // ==== ГОЛОВНЕ ====
  // Слідкуємо за змінами variant.id через мутації DOM (MutationObserver)
  var form = document.querySelector('form[action^="/cart/add"]');
  if (form) {
    var variantInput = form.querySelector('input[name="id"], select[name="id"]');
    if (variantInput) {
      var lastVariantId = variantInput.value;
      var observer = new MutationObserver(function() {
        var newId = variantInput.value;
        if (newId !== lastVariantId) {
          updateMetafields(newId);
          lastVariantId = newId;
        }
      });
      observer.observe(variantInput, { attributes: true, attributeFilter: ['value'] });
      variantInput.addEventListener('change', function() {
        updateMetafields(variantInput.value);
        lastVariantId = variantInput.value;
      });
    }
  }

  // --- Для сучасних тем — якщо кастомна подія variant:change
  document.body.addEventListener('variant:change', function(e) {
    if (e.detail && e.detail.variant && e.detail.variant.id) {
      updateMetafields(e.detail.variant.id);
    }
  });
});
