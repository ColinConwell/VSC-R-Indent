import { expect } from 'chai';
import { RParser } from '../../src/indentation/rParser';

describe('RParser.parseRCode', () => {
  it('ignores brackets inside strings', () => {
    const res = RParser.parseRCode('f(")")', 0);
    // The closing parenthesis inside the string should be ignored; the final
    // closing parenthesis after the string matches the opening one → no unmatched
    expect(res.openBrackets.length).to.equal(0);
  });

  it('stops on # comments', () => {
    const res = RParser.parseRCode('f( # ) after comment', 0);
    // the closing ) after # should be ignored; resulting unmatched opening remains
    expect(res.openBrackets.length).to.equal(1);
  });
});


