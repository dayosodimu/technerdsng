@a11y @mobile
Feature: Mobile navigation menu (390 × 844 viewport)
  As a screen-reader or keyboard user on a phone
  I want the collapsible menu to announce its state and be operable by keyboard
  So that I can find pages on a small screen

  Background:
    Given I open the "Home" page

  # TC-MOB-01 — WCAG 4.1.2 Name, Role, Value
  @positive @smoke @wcag-4.1.2
  Scenario: Menu toggle exposes its name, state and controlled region
    Then the menu toggle should have accessible name "Open navigation menu"
    And the menu toggle should have "aria-expanded" set to "false"
    And the menu toggle should control the element "primary-navigation"
    And the primary navigation should be hidden

  # TC-MOB-02 — WCAG 2.1.1 / 4.1.2
  @positive @wcag-4.1.2
  Scenario: Opening the menu with the keyboard updates state and reveals links
    When I focus the menu toggle and press "Enter"
    Then the menu toggle should have "aria-expanded" set to "true"
    And the menu toggle should have accessible name "Close navigation menu"
    And the primary navigation should be visible
    When I press "Tab"
    Then the focused element should be the link "About Us"

  # TC-MOB-03 — WCAG 2.1.2 / 2.4.3
  @negative @wcag-2.4.3
  Scenario: Escape closes the open menu and returns focus to the toggle
    When I focus the menu toggle and press "Enter"
    And I press "Escape"
    Then the menu toggle should have "aria-expanded" set to "false"
    And the primary navigation should be hidden
    And the menu toggle should have keyboard focus

  # TC-MOB-04 — WCAG 2.4.3
  @negative @wcag-2.4.3
  Scenario: Links inside the collapsed menu cannot receive focus
    When I press "Tab" 6 times
    Then no hidden primary navigation link should have received focus

  # TC-MOB-05
  @positive
  Scenario: Mobile layout has no serious or critical WCAG violations
    When I run an axe-core scan against WCAG 2.2 AA
    Then there should be no "serious" or worse violations except tracked rule "meta-viewport"
