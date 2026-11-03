@a11y @keyboard
Feature: Keyboard-only navigation
  As a keyboard-only user
  I want to reach and operate everything with Tab, Shift+Tab and Enter
  So that I do not need a mouse

  Background:
    Given I open the "Home" page

  # TC-KEY-01 — WCAG 2.4.1 Bypass Blocks
  @positive @smoke @wcag-2.4.1
  Scenario: Skip link is the first focusable element and jumps to main content
    When I press "Tab"
    Then the focused element should be the link "Skip to main content"
    And the focused element should be fully visible in the viewport
    When I press "Enter"
    Then focus should move to the main content region

  # TC-KEY-02 — WCAG 2.4.3 Focus Order
  @positive @wcag-2.4.3
  Scenario: Header focus order matches the visual order
    When I press "Tab" 7 times
    Then the focus order should have been:
      | Skip to main content |
      | Technerds home       |
      | About Us             |
      | Services             |
      | News                 |
      | Process              |
      | Contact              |

  # TC-KEY-03 — WCAG 2.4.3
  @positive @wcag-2.4.3
  Scenario: Shift+Tab moves focus backwards
    When I press "Tab" 3 times
    And I press "Shift+Tab"
    Then the focused element should be the link "Technerds home"

  # TC-KEY-04 — WCAG 2.4.7 Focus Visible
  @positive @wcag-2.4.7
  Scenario: Every focusable element shows a visible focus indicator
    When I tab through the whole page
    Then every focused element should have a visible focus indicator

  # TC-KEY-05 — WCAG 2.1.1 Keyboard
  @positive @wcag-2.1.1
  Scenario: A navigation link can be activated with the Enter key
    Given the cookie banner is dismissed
    When I move focus to the primary navigation link "Services"
    And I press "Enter"
    Then the "Services" page should load with a descriptive title

  # TC-KEY-06 — WCAG 2.1.2 No Keyboard Trap
  @negative @wcag-2.1.2
  Scenario: Keyboard focus is never trapped
    When I tab through the whole page
    Then focus should have reached the footer "Privacy options" button
    And focus should never have stayed on the same element for consecutive Tab presses

  # TC-KEY-07 — WCAG 2.4.11 Focus Not Obscured (Minimum)
  @negative @known-defect @wcag-2.4.11
  Scenario: Focused elements are not hidden behind the cookie banner
    When I tab through the page while the cookie banner is open
    Then no focused element should be fully covered by the cookie banner
