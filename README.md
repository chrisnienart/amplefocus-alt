# Amplefocus *Alternative*

This is an [Amplenote plugin](https://www.amplenote.com/help/developing_amplenote_plugins) that
makes gives an alternative setup to the official [Amplefocus plugin](https://public.amplenote.com/XqCZ5b6qfsXQPRM8ZJRo8CrF).

## Changes from the original plugin
### November 2024
- Use `{Focus}` instead of `{Start Focus}` to start a session
- Default start time is within the next `5` minutes
- Default number of sessions is `1` session
- Logging is stored under the tag `plugin/amplefocus-alt`
- Added `loadNoteText` option for Amplefocus questions
  - Note logging is set to `false` by default