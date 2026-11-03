import { When } from '@cucumber/cucumber';
import { A11yWorld } from '../support/world';

/** Known-bad markup used to prove the checks detect real defects (negative controls). */
const DEFECTS: Record<string, string> = {
  'image without alt': '<img src="/brand/technerd-icon.png" width="40" height="40">',
  'icon button without a name': '<button type="button"><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg></button>',
  'empty link': '<a href="/services"></a>',
  'unlabelled text input': '<input type="text" name="email">',
  'low contrast text': '<p style="color:#cfcfcf;background:#ffffff;font-size:14px">Low contrast copy</p>',
  'focusable aria-hidden content': '<div aria-hidden="true"><a href="/services">Hidden but focusable</a></div>',
  'invalid ARIA attribute': '<div role="button" tabindex="0" aria-expandd="false">Bad ARIA</div>',
  'fixed 1000px wide box': '<div style="width:1000px;height:20px;background:#eee">wide</div>',
};

When('I inject the defect {string} into the main content', async function (this: A11yWorld, defect: string) {
  const html = DEFECTS[defect];
  if (!html) throw new Error(`Unknown defect "${defect}"`);
  await this.page.locator('main').evaluate((main, markup) => {
    const holder = document.createElement('div');
    holder.setAttribute('data-test-injected', '');
    holder.innerHTML = markup;
    main.prepend(holder);
  }, html);
});
