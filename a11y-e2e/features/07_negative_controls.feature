@a11y @negative @control
Feature: Negative controls — the suite must catch real accessibility defects
  As a QA engineer
  I want to inject known accessibility defects into the live page
  So that I can prove the checks fail when they should (no false passes)

  Background:
    Given I open the "Home" page

  # TC-NEG-01..07
  Scenario Outline: Injected defect "<defect>" is reported by axe-core as "<rule>"
    When I inject the defect "<defect>" into the main content
    And I run an axe-core scan against WCAG 2.2 AA
    Then axe-core should report the rule "<rule>"

    Examples:
      | defect                     | rule                   |
      | image without alt          | image-alt              |
      | icon button without a name | button-name            |
      | empty link                 | link-name              |
      | unlabelled text input      | label                  |
      | low contrast text          | color-contrast         |
      | focusable aria-hidden content | aria-hidden-focus   |
      | invalid ARIA attribute     | aria-valid-attr        |

  # TC-NEG-08 — WCAG 2.4.7 control
  Scenario: Removing the focus outline is detected by the focus-visible check
    When I remove all focus styles from the page
    And I tab through the whole page
    Then the focus-visible check should report at least one element without an indicator

  # TC-NEG-09 — WCAG 1.4.10 control
  Scenario: A fixed-width element wider than the viewport is detected by the reflow check
    Given the viewport is 320 by 640 pixels
    When I inject the defect "fixed 1000px wide box" into the main content
    Then content should extend beyond the viewport
