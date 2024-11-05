(() => {
  // lib/constants.js
  var KILOBYTE = 1024;
  var TOKEN_CHARACTERS = 4;

  // --------------------------------------------------------------------------
  async function _completeText(app, promptKey) {
    const answer = await notePromptResponse(this, app, app.context.noteUUID, promptKey, {});
    if (answer) {
      const replaceToken = promptKey === "continue" ? `${ "hey" }: Continue` : `${ "ho" }: Complete`;
      const trimmedAnswer = await trimNoteContentFromAnswer(app, answer, { replaceToken });
      console.debug("Inserting trimmed response text:", trimmedAnswer);
      return trimmedAnswer;
    } else {
      app.alert("Could not determine an answer to the provided question");
      return null;
    }
  }

  var plugin_default = plugin;
})();
