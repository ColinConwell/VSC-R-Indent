# Test file for simplified bracket alignment

# Test 1: Chain completion bug fix - indentation should return to start after completed function
strtoi("5", 
       base = 
          10L)
# Cursor here should have NO indentation (bug fix test)

# Test 2: Empty bracket case - VSCode should handle this (multi-line with cursor inside)
# strtoi(|) should become:
# strtoi(
#   |  <- cursor here
# )

# Test 3: Cursor after opening bracket with content - should use default indent (2 spaces)
strtoi(
# Cursor after ( should indent 2 spaces from function start

# Test 4: Cursor before closing bracket - should wrap with NO additional indent (RStudio behavior)
c(1, 2|) # Cursor before ) should wrap to new line with no indent

# Test 4: Traditional bracket alignment - when not adjacent to bracket
strtoi("5",
       base = 10L)

# Test 4: Complex function with first-argument alignment
ggplot(
  data = mtcars,
  aes(x = disp, y = mpg)
) +
  geom_point()

# Test 5: Vector/list with first-element alignment
c(
  1,
  2,
  3
)

# Test 6: Mixed case - some args on same line, some on new lines
complex_function(arg1 = "value1",
                 arg2 = list(
                   item1 = 1,
                   item2 = 2
                 ),
                 arg3 = "value3")

# Test 7: Chain completion after ggplot
ggplot(mtcars) +
  geom_point() +
  labs(title = "Test")
# Cursor here should have NO indentation (chain completion)

# Test 8: Pipe chain completion
mtcars %>%
  filter(mpg > 20) %>%
  select(mpg, cyl)
# Cursor here should have NO indentation (chain completion)
