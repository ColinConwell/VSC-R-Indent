import { expect } from 'chai';
import { isParameterAssignmentBeforeCursor } from '../../src/utils/rSyntaxUtils';

describe('isParameterAssignmentBeforeCursor', () => {
  it('matches simple param assignment', () => {
    expect(isParameterAssignmentBeforeCursor('a =')).to.equal(true);
    expect(isParameterAssignmentBeforeCursor('name=')) .to.equal(true);
    expect(isParameterAssignmentBeforeCursor('patch.size =   ')).to.equal(true);
  });

  it('rejects comparisons', () => {
    expect(isParameterAssignmentBeforeCursor('x ==')).to.equal(false);
    expect(isParameterAssignmentBeforeCursor('y !=   ')).to.equal(false);
    expect(isParameterAssignmentBeforeCursor('a <= ')).to.equal(false);
    expect(isParameterAssignmentBeforeCursor('b >= ')).to.equal(false);
  });

  it('rejects when not at end of name =', () => {
    expect(isParameterAssignmentBeforeCursor('foo = 1')).to.equal(false);
    expect(isParameterAssignmentBeforeCursor('foo')).to.equal(false);
  });
});


