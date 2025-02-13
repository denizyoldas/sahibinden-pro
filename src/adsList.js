'use strict';
import { damageTypeEnum } from "@/enums";
import {
  ads,
  get_ads_displayed,
  get_blocked_store,
  options,
  options_enum
} from "./storage";
import {adDetail} from "./adDetail";
import {is_damage, is_painted, reformattedContent} from "./helpers";

const hideAds = options_enum.hideAds;

async function allAdsConf() {
  const ads_element = document.querySelectorAll('tbody.searchResultsRowClass tr');
  if (ads_element) {
    for (const item of ads_element) {
      if (item.classList.contains('searchResultsPromoSuper')) {
        continue;
      }
      item.style.display = 'table-row';

      const id = item.getAttribute('data-id');
      let href = item.querySelector('td.searchResultsTitleValue a.classifiedTitle');
      if (href) {
        href = href.getAttribute('href');
      }

      const itemLoadingMessageDOM = `<span class="spro-item-loading-message">Bilgiler alınıyor...</span>`;

      await ads.get({[id]: null}).then(async r => {

          // Render loading message
          item.querySelector('td.searchResultsTitleValue').innerHTML += itemLoadingMessageDOM;

          let get_ads = r[id];

          if (!get_ads && href) {
            const url = `https://www.sahibinden.com${href}`;
            await fetch(url)
              .then(response => response.text())
              .then(async data => {
                get_ads = await adDetail(data);
              }).catch(err => {
                console.log(err);
              })
            await new Promise(resolve => setTimeout(resolve, 2000))
          }

          if (get_ads) {
            // Hide loading message
            await item.querySelector('.spro-item-loading-message').classList.add('spro-d-none');

            item.setAttribute('data-store_name', get_ads.advertiser_store_username);

            if (get_ads['advertiser_store_name']) {
              item.querySelector('td.searchResultsTitleValue').insertAdjacentHTML('afterbegin', `
                <span class="spro-store-advertiser-name spro-color-text-attention">${get_ads['advertiser_store_name']}</span>
              `)
            } else if (get_ads['advertiser_name']) {
              item.querySelector('td.searchResultsTitleValue').insertAdjacentHTML('afterbegin', `
                <span class="spro-store-advertiser-name spro-color-text-success">${get_ads['advertiser_name']}</span>
              `)
            }

            const ad_content = get_ads['title'] + ' ' + get_ads['description'];
            const format_content = reformattedContent(ad_content);
            if (get_ads['id']=='1061879602'){
              console.log('format_content', format_content);
            }

            // Damage Element Creator
            const damage_type = is_damage(format_content);

            const damage_class = () => {
              if (damage_type === damageTypeEnum.SEVERE) {
                return 'severe-damage spro-label--danger'
              } else if (damage_type === damageTypeEnum.LIGHT) {
                return 'light-damage spro-label--attention'
              } else {
                return 'no-damage spro-label--accent'
              }
            }

            const damage_text = () => {
              if (damage_type === damageTypeEnum.SEVERE) {
                return 'Ağır Hasar kaydı var'
              } else if (damage_type === damageTypeEnum.LIGHT) {
                return 'Hasar kaydı var'
              } else {
                return 'Hasarsız'
              }
            }

            // Painted Element Creator
            const painted = is_painted(format_content);

            const painted_class = () => {
              return painted ? 'painted spro-label--attention' : 'not-painted spro-label--accent';
            }

            const painted_text = () => {
              return painted ? 'Boyalı' : 'Boyasız';
            }

            const label_elements = [
              {
                'is_show': damage_type > 0,
                'text': damage_text(),
                'class': `spro-${damage_class()}`,
                'html_tag': 'searchResultsTitleValue'
              },
              {
                'is_show': painted,
                'text': painted_text(),
                'class': `spro-${painted_class()}`,
                'html_tag': 'searchResultsTitleValue'
              }
            ];

            item.querySelector('.searchResultsTitleValue').innerHTML += `
              <div class="spro-featured-labels spro-mt-2"></div>
            `

            for (const label_element of label_elements) {
              if (label_element.is_show) {
                item.querySelector(`.spro-featured-labels`).innerHTML += `
                  <span class="spro-label ${label_element.class}">${label_element.text}</span>
                `
              }
            }

            const extra_element_names = {
              'gear': {
                'name': 'gear',
                'html_tag': 'searchResultsTagAttributeValue'
              },
              'fuel': {
                'name': 'fuel',
                'html_tag': 'searchResultsTagAttributeValue'
              },
              'engine_power': {
                'name': 'engine_power',
                'html_tag': 'searchResultsTagAttributeValue',
                'text': 'HP'
              }
            }

            for (const extra_element_name in extra_element_names) {
              if (get_ads[extra_element_names[extra_element_name].name]) {
                const br_element = document.createElement('br');
                const has_element = item.querySelector('td.' + extra_element_names[extra_element_name].html_tag);
                if (has_element) {
                  has_element.append(br_element);
                }

                const extra_element = document.createElement('span');
                extra_element.setAttribute('class', 'spro-' + extra_element_name);
                extra_element.innerText = get_ads[extra_element_names[extra_element_name].name];
                if (extra_element_names[extra_element_name].text) {
                  extra_element.innerText += ' ' + extra_element_names[extra_element_name].text;
                }
                if (has_element) {
                  has_element.append(extra_element);
                }
              }
            }
          }
        }
      );
    }
  }
}

export async function makeHide() {
  const displayed_ads_ids = await get_ads_displayed();
  const blocked_store_names = await get_blocked_store();
  const ads_element = document.querySelectorAll('tbody.searchResultsRowClass tr');

  options.get({[hideAds]: 0}).then(async r => {
    if (ads_element) {
      for (const item of ads_element) {
        const id = item.getAttribute('data-id');
        const store_name = item.getAttribute('data-store_name');
        if (blocked_store_names.includes(store_name)) {
          item.style.display = 'none';
        } else {
          if (displayed_ads_ids.includes(id)) {
            item.style.display = r[hideAds] ? 'none' : 'table-row';
          } else {
            item.style.display = 'table-row';
          }
        }
      }
    }
  });
}

export async function ads_list_page() {
  await allAdsConf();
  await makeHide();
}
