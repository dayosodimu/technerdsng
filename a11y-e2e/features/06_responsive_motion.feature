@a11y @responsive
Feature: Reflow, text resizing, text spacing and motion
  As a low-vision user or a user sensitive to motion
  I want content to adapt to zoom, spacing and motion preferences
  So that nothing is lost or uncomfortable to use

  # TC-RSP-01..04 — WCAG 1.4.10 Reflow
  @positive @wcag-1.4.10
  Scenario Outline: <page> page reflows at 320 CSS pixels without loss of content
    Given the viewport is 320 by 640 pixels
    And I open the "<page>" page
    Then the page should not scroll horizontally
    And no text or control should be cut off at the viewport edge

    @known-defect
    Examples: About and contact text is clipped
      | page |
      | Home |

    Examples:
      | page     |
      | Services |
      | Contact  |
      | Process  |

  # TC-RSP-05 — WCAG 1.4.4 Resize Text
  @positive @wcag-1.4.4
  Scenario: Text resized to 200% does not cause horizontal scrolling or hide the main heading
    Given I open the "Home" page
    When I resize text to 200 percent
    Then the page should not scroll horizontally
    And no text or control should be cut off at the viewport edge
    And the level-1 heading should be visible

  # TC-RSP-06 — WCAG 1.4.12 Text Spacing
  @positive @wcag-1.4.12
  Scenario: Increased text spacing does not clip content
    Given I open the "Home" page
    When I apply the WCAG text-spacing overrides
    Then the page should not scroll horizontally
    And no text container should clip its content

  # TC-RSP-07 — WCAG 2.3.3 Animation from Interactions
  @positive @reduced-motion @wcag-2.3.3
  Scenario: Animations are disabled when the user prefers reduced motion
    Given I open the "Home" page
    Then no element should be running a CSS animation

  # TC-RSP-08 — control for TC-RSP-07
  @negative
  Scenario: Without a reduced-motion preference the hero animation does run
    Given I open the "Home" page
    Then at least one element should be running a CSS animation
