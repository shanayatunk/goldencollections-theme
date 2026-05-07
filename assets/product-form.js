// Helper function to detect mobile (globally or locally scoped)
function isMobileView() {
  return window.innerWidth < 750; // Matches Dawn's typical mobile breakpoint
}

// Toast Message Function (globally or locally scoped)
function showToast(message, type = 'success', duration = 3000) {
  if (!isMobileView()) return; // Only show toasts on mobile

  let toast = document.querySelector('.custom-toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'custom-toast-message';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = 'custom-toast-message'; // Reset classes
  toast.classList.add(type); // 'success' or 'warning'
  toast.style.display = 'block'; // Make it block before adding 'show' for transition

  // Force reflow to ensure transition plays
  // void toast.offsetWidth;

  toast.classList.add('show');

  // Clear any existing timer
  if (toast.currentTimer) {
    clearTimeout(toast.currentTimer);
  }

  toast.currentTimer = setTimeout(() => {
    toast.classList.remove('show');
    // Wait for transition to finish before hiding with display:none
    setTimeout(() => {
        if (!toast.classList.contains('show')) { // check if it wasn't reshown
            toast.style.display = 'none';
        }
    }, 350); // Should match CSS transition duration
  }, duration);
}


if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');

        if (this.submitButton) {
          this.originalButtonContent = this.submitButton.innerHTML; // Store original HTML (text + spinner)
          this.submitButton.dataset.originalText = this.submitButton.textContent.trim();
        }

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';

        if (this.variantIdInput) { // Safely access getter
            this.variantIdInput.disabled = false;
        }
        
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.addEventListener('change', this.onVariantChange.bind(this)); // For variant changes
      }

      onVariantChange() {
        if (isMobileView()) {
          this.resetButtonToAddToCart();
        }
      }

      resetButtonToAddToCart() {
        if (this.submitButton && this.submitButton.dataset.isGoToCart === 'true') {
          this.submitButton.innerHTML = this.originalButtonContent;
          this.submitButton.classList.remove('go-to-cart-btn');
          this.submitButton.removeAttribute('aria-disabled');
          this.submitButton.disabled = false;
          this.submitButton.dataset.isGoToCart = 'false';

          const spinner = this.submitButton.querySelector('.loading__spinner');
          if (spinner) {
            spinner.classList.add('hidden');
          }
          if (this.variantIdInput) {
            this.variantIdInput.disabled = false;
          }
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();

        if (isMobileView() && this.submitButton.dataset.isGoToCart === 'true') {
          window.location.href = window.routes.cart_url;
          return;
        }

        if (this.submitButton.getAttribute('aria-disabled') === 'true' || this.submitButton.disabled) return;

        this.handleErrorMessage();

        const quantityInput = this.form.querySelector('input[name="quantity"]');
        let maxAllowedQuantity = null;
        if (quantityInput && quantityInput.hasAttribute('max')) {
            maxAllowedQuantity = parseInt(quantityInput.getAttribute('max'), 10);
        }
        const requestedQuantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

        if (maxAllowedQuantity !== null && requestedQuantity > maxAllowedQuantity) {
            showToast('Maximum quantity for this item exceeded.', 'warning');
            return;
        }

        this.submitButton.setAttribute('aria-disabled', 'true');
        this.submitButton.classList.add('loading');
        const spinner = this.submitButton.querySelector('.loading__spinner');
        if (spinner) spinner.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) { // Shopify specific error status
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
              if (isMobileView()) {
                showToast(response.description || 'Error adding item.', 'warning');
              }

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) {
                  this.submitButton.setAttribute('aria-disabled', 'true');
              } else {
                this.submitButton.setAttribute('aria-disabled', 'true');
                const buttonTextSpan = this.submitButton.querySelector('span:not(.loading__spinner)');
                if(buttonTextSpan) buttonTextSpan.classList.add('hidden');
                soldOutMessage.classList.remove('hidden');
              }
              this.error = true;
              this.submitButton.classList.remove('loading');
              const spinnerOnError = this.submitButton.querySelector('.loading__spinner');
              if (spinnerOnError) spinnerOnError.classList.add('hidden');
              return;
            }

            // --- SUCCESSFUL ADD ---
            this.error = false;
            const productVariantId = formData.get('id');

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'product-form',
              productVariantId: productVariantId,
              cartData: response,
            }).then(() => {
              CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
            });

            if (isMobileView()) {
              showToast('Item added to cart!', 'success');
              this.submitButton.textContent = 'Go to Cart';
              this.submitButton.classList.add('go-to-cart-btn');
              this.submitButton.dataset.isGoToCart = 'true';
              
              this.submitButton.classList.remove('loading');
              this.submitButton.removeAttribute('aria-disabled');
              this.submitButton.disabled = false;
              const spinnerMobileSuccess = this.submitButton.querySelector('.loading__spinner');
              if (spinnerMobileSuccess) spinnerMobileSuccess.classList.add('hidden');
              
              // Rely on publish(PUB_SUB_EVENTS.cartUpdate) to handle cart count updates
              // and potential drawer updates without forcing navigation.

            } else {
              // ---- DESKTOP SUCCESS LOGIC ----
              const quickAddModal = this.closest('quick-add-modal');
              if (quickAddModal) {
                document.body.addEventListener(
                  'modalClosed',
                  () => {
                    setTimeout(() => {
                      CartPerformance.measure("add:paint-updated-sections-qam-desktop", () => {
                        if (this.cart) this.cart.renderContents(response);
                      });
                    });
                  },
                  { once: true }
                );
                quickAddModal.hide(true);
              } else if (this.cart) {
                CartPerformance.measure("add:paint-updated-sections-desktop", () => {
                  this.cart.renderContents(response);
                });
              } else {
                window.location = window.routes.cart_url; // Fallback for DESKTOP if no cart element
                return;
              }
              // Reset button for desktop after successful add & cart interaction
              this.submitButton.classList.remove('loading');
              this.submitButton.removeAttribute('aria-disabled');
              const spinnerDesktopSuccess = this.submitButton.querySelector('.loading__spinner');
              if (spinnerDesktopSuccess) spinnerDesktopSuccess.classList.add('hidden');
            }
          })
          .catch((e) => {
            console.error(e);
            this.handleErrorMessage('An unexpected error occurred.');
            if (isMobileView()) {
              showToast('Could not add item to cart.', 'warning');
            }
            this.submitButton.classList.remove('loading');
            const spinnerCatch = this.submitButton.querySelector('.loading__spinner');
            if (spinnerCatch) spinnerCatch.classList.add('hidden');
            // Consider if button should be re-enabled or reflect an error state
            // For now, matches prior logic of removing loading state.
            // If an error means it should stay disabled (like sold out), that's handled in response.status block
          })
          .finally(() => {
            if (!(isMobileView() && this.submitButton.dataset.isGoToCart === 'true')) {
                if (!this.error && this.submitButton.getAttribute('aria-disabled') !== 'true') { // Only remove if no error and not already explicitly disabled by error handling
                    this.submitButton.removeAttribute('aria-disabled');
                }
                // Ensure loading class is removed if not already handled (e.g., in a GoToCart state or specific error path)
                if(!this.submitButton.classList.contains('go-to-cart-btn')) { // don't remove loading if it's now GoToCart
                    this.submitButton.classList.remove('loading');
                    const spinnerFinally = this.submitButton.querySelector('.loading__spinner');
                    if (spinnerFinally) spinnerFinally.classList.add('hidden');
                }
            }
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return; // [cite: 2]
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper'); // [cite: 18]
        if (!this.errorMessageWrapper) return; // [cite: 18]
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message'); // [cite: 19]

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage); // [cite: 19]

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage; // [cite: 19]
        }
      }

      toggleSubmitButton(disable = true, text) { // This method is from original Dawn - kept for structural integrity if used elsewhere
        const buttonTextSpan = this.submitButton.querySelector('span:not(.loading__spinner)');

        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          this.submitButton.setAttribute('aria-disabled', 'true');
          if (text && buttonTextSpan) buttonTextSpan.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButton.removeAttribute('aria-disabled');
          if (buttonTextSpan && window.variantStrings) buttonTextSpan.textContent = window.variantStrings.addToCart; // [cite: 22]
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]'); // [cite: 22]
      }
    }
  );
}