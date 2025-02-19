package com.vaadin.hilla.test.reactgrid;

import org.junit.Test;

import com.vaadin.flow.component.textfield.testbench.TextFieldElement;

public class ReadOnlyGridOrFilterIT extends AbstractGridTest {

    @Test
    public void findsMatches() {
        setFilter("car");
        assertRowCount(2);
        assertName(0, "Abigail", "Carter");
        assertName(1, "Oscar", "Nelson");

        setFilter("");
        assertRowCount(50);

        setFilter("zan");
        assertRowCount(1);
        assertName(0, "Xander", "Zane");

    }

    private void setFilter(String filter) {
        $(TextFieldElement.class).id("filter").setValue(filter);
    }

}
