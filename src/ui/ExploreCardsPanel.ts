import { VIEW_CARDS, type ViewCard } from "./viewCards";
import type { LayerId } from "../lib/timeline";

export interface ExploreCardsPanelCallbacks {
  onSelectCard: (card: ViewCard) => void;
  onThenNow: (card: ViewCard) => void;
  onShare: (card: ViewCard) => void;
  onClip: (card: ViewCard) => void;
  onClose: () => void;
}

export class ExploreCardsPanel {
  readonly element: HTMLElement;
  private currentLayer: LayerId | undefined;

  constructor(
    container: HTMLElement,
    private callbacks: ExploreCardsPanelCallbacks
  ) {
    this.element = document.createElement("div");
    this.element.className = "clima-panel explore-cards-panel";
    container.appendChild(this.element);
    this.render();
  }

  setActiveLayer(layerId: LayerId): void {
    this.currentLayer = layerId;
    this.element.querySelectorAll(".explore-card").forEach((cardEl) => {
      const cardLayer = (cardEl as HTMLElement).dataset.layer;
      cardEl.classList.toggle("is-active", cardLayer === layerId);
    });
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="clima-panel__header">
        <div class="explore-header-left">
          <span class="clima-panel__title">What do you want to see?</span>
          <span class="explore-count-tag">${VIEW_CARDS.length} views</span>
        </div>
        <button type="button" class="clima-icon-btn close-cards-btn" title="Close Explore Cards" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="explore-cards-grid">
        ${VIEW_CARDS.map((card, index) => {
          const isActive = card.layer === this.currentLayer;
          return `
            <article class="explore-card ${isActive ? "is-active" : ""}" data-card-id="${card.id}" data-layer="${card.layer ?? ""}">
              <button type="button" class="explore-card__main" aria-label="Explore ${card.title}">
                <span class="explore-card__number">${String(index + 1).padStart(2, "0")}</span>
                <span class="explore-card__copy">
                  <strong class="explore-card__title">${card.title}</strong>
                  <span class="explore-card__blurb">${card.blurb}</span>
                </span>
                <span class="explore-card__arrow" aria-hidden="true">→</span>
              </button>
              <div class="explore-card__content">
                <div class="explore-card__actions">
                  <button type="button" class="explore-card__action-btn then-now-btn" title="Compare Then & Now">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="8 8 4 12 8 16"/><polyline points="16 8 20 12 16 16"/></svg>
                    <span>Then &amp; now</span>
                  </button>
                  <button type="button" class="explore-card__action-btn share-card-btn" title="Share this view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                  <button type="button" class="explore-card__action-btn clip-card-btn" title="Record time-lapse video">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>
                  </button>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;

    // Event listeners
    this.element.querySelector(".close-cards-btn")?.addEventListener("click", () => {
      this.callbacks.onClose();
    });

    this.element.querySelectorAll(".explore-card").forEach((cardEl) => {
      const cardId = (cardEl as HTMLElement).dataset.cardId;
      const card = VIEW_CARDS.find((c) => c.id === cardId);
      if (!card) return;

      // Click anywhere on thumbnail or title -> switch view
      cardEl.querySelector(".explore-card__main")?.addEventListener("click", () => {
        this.callbacks.onSelectCard(card);
      });

      // Then & Now comparison button
      cardEl.querySelector(".then-now-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.callbacks.onThenNow(card);
      });

      // Share button
      cardEl.querySelector(".share-card-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.callbacks.onShare(card);
      });

      // Clip button
      cardEl.querySelector(".clip-card-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.callbacks.onClip(card);
      });
    });
  }
}
