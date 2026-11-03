@a11y @cookies
Feature: Cookie consent banner
  As a user of assistive technology
  I want the cookie banner to be labelled, keyboard operable and to remember my choice
  So that consent does not block me from using the site

  Background:
    Given I open the "Home" page

  # TC-CK-01 — WCAG 1.3.1 / 4.1.2
  @positive @smoke @wcag-4.1.2
  Scenario: Banner is a labelled region with named buttons
    Then the cookie banner should be a region labelled "Your cookie choices"
    And the cookie banner should offer the buttons:
      | Accept all cookies      |
      | Reject optional cookies |
      | Customize choices       |

  # TC-CK-02 — WCAG 2.1.1
  @positive @wcag-2.1.1
  Scenario: Rejecting optional cookies with the keyboard dismisses the banner and is remembered
    When I activate the cookie button "Reject optional cookies" with the keyboard
    Then the cookie banner should not be visible
    When I reload the page
    Then the cookie banner should not be visible

  # TC-CK-03 — WCAG 2.4.3 / 1.3.1
  @positive @wcag-2.4.3
  Scenario: Customize moves focus to the category settings and every toggle is labelled
    When I activate the cookie button "Customize choices" with the keyboard
    Then focus should move into the cookie category settings
    And every cookie category checkbox should have a programmatic label

  # TC-CK-04 — WCAG 3.2.6 Consistent Help / 2.1.1
  @positive @wcag-2.1.1
  Scenario: Privacy options in the footer re-opens the banner from the keyboard
    Given the cookie banner is dismissed
    When I move focus to the footer "Privacy options" button and press "Enter"
    Then the cookie banner should be visible

  # TC-CK-05
  @negative
  Scenario: Cookie banner content has no WCAG violations in either state
    When I scan only the cookie banner against WCAG 2.2 AA
    Then there should be no violations
    When I activate the cookie button "Customize choices" with the keyboard
    And I scan only the cookie banner against WCAG 2.2 AA
    Then there should be no violations
