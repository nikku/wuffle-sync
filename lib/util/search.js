
function parseSearch(str) {

  const regexp = /(?:([\w]+)|"([\w\s]+)"|([\w]+):(?:([\w]+)|"([\w ]+)"))(?:\s|$)/g;

  const terms = [];

  let match;

  while ((match = regexp.exec(str))) {

    const [
      _, // eslint-disable-line
      text,
      textEscaped,
      qualifier,
      qualifierValue,
      qualifierValueEscaped
    ] = match;

    if (text || textEscaped) {
      terms.push({
        qualifier: 'text',
        value: text || textEscaped
      });
    }

    if (qualifier) {
      terms.push({
        qualifier,
        value: qualifierValue || qualifierValueEscaped
      });
    }
  }

  return terms;
}

module.exports.parseSearch = parseSearch;