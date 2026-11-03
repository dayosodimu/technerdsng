@a11y @scan
Feature: Automated WCAG 2.2 AA scan of every public page
  As a user of assistive technology
  I want every page on technerdsng.com to meet WCAG 2.2 AA
  So that I can read and use the site without barriers

  # TC-SCAN-01..07
  @positive @smoke
  Scenario Outline: <page> page content has no serious or critical WCAG 2.2 AA violations
    Given I open the "<page>" page
    When I run an axe-core scan against WCAG 2.2 AA
    Then there should be no "serious" or worse violations except tracked rule "meta-viewport"

    Examples:
      | page           |
      | Home           |
      | About Us       |
      | Services       |
      | News           |
      | Process        |
      | Contact        |
      | Privacy Policy |

  # TC-SCAN-08 — WCAG 1.4.4 Resize Text
  @negative @known-defect @wcag-1.4.4
  Scenario: Pages must not block pinch-zoom through the viewport meta tag
    When I visit every public page
    Then no page should restrict zoom with "maximum-scale" below 2 or "user-scalable=no"

  # TC-SCAN-09..10 — axe best-practice rules
  @negative @best-practice
  Scenario Outline: <page> page passes axe best-practice landmark rules
    Given I open the "<page>" page
    When I run the axe-core rules "landmark-one-main, landmark-unique, region, landmark-complementary-is-top-level, page-has-heading-one"
    Then there should be no violations

    @known-defect
    Examples: Pages with a nested <aside>
      | page    |
      | Home    |
      | Contact |

    Examples: Other pages
      | page     |
      | About Us |
      | Services |
